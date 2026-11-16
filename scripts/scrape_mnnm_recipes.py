#!/usr/bin/env python3
"""Export Món Ngon Mỗi Ngày recipe pages from its public recipe sitemaps.

The scraper stays on monngonmoingay.com, reads only the recipe sitemap family,
uses a polite sequential request rate, and resumes from successful JSONL rows.
"""

from __future__ import annotations

import argparse
from collections import Counter
import json
import logging
import re
import sys
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse, urlunparse

import requests
from bs4 import BeautifulSoup, Tag
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


BASE_URL = "https://monngonmoingay.com"
SITEMAP_INDEX_URL = f"{BASE_URL}/sitemap_index.xml"
DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / "data-archive" / "monngonmoingay_source_2026-11-14"
RECIPE_SITEMAP_PATH = re.compile(r"^/monan-sitemap\d+\.xml$")
RECIPE_ARCHIVE_PATH = "/mon-an/"
SECTION_IDS = {
    "description": "section-desc",
    "ingredients": "section-nguyenlieu",
    "preparation": "section-soche",
    "cooking": "section-thuchien",
    "serving": "section-howtouse",
    "tips": "section-tips",
}
HEADERS = {
    "User-Agent": "NauDaiRecipeImporter/1.0",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.5",
}


def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


def clean_text(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def make_session() -> requests.Session:
    session = requests.Session()
    session.headers.update(HEADERS)
    retry = Retry(
        total=4,
        connect=4,
        read=3,
        status=4,
        backoff_factor=1.5,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset(("GET",)),
        respect_retry_after_header=True,
    )
    session.mount("https://", HTTPAdapter(max_retries=retry))
    return session


class RateLimiter:
    def __init__(self, delay_seconds: float):
        self.delay_seconds = max(0.0, delay_seconds)
        self.last_request_at = 0.0

    def wait(self) -> None:
        wait_for = self.last_request_at + self.delay_seconds - time.monotonic()
        if wait_for > 0:
            time.sleep(wait_for)
        self.last_request_at = time.monotonic()


def fetch_text(session: requests.Session, url: str, limiter: RateLimiter) -> tuple[str, requests.Response]:
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.netloc != urlparse(BASE_URL).netloc:
        raise ValueError(f"Refusing URL outside the configured source: {url}")
    limiter.wait()
    response = session.get(url, timeout=(15, 45))
    response.raise_for_status()
    return response.text, response


def sitemap_children(xml_text: str) -> list[str]:
    root = ET.fromstring(xml_text)
    urls: list[str] = []
    for element in root.iter():
        if local_name(element.tag) != "loc" or not element.text:
            continue
        candidate = element.text.strip()
        parsed = urlparse(candidate)
        if parsed.scheme == "https" and parsed.netloc == urlparse(BASE_URL).netloc:
            urls.append(urlunparse(parsed._replace(query="", fragment="")))
    return urls


def discover_recipe_urls(session: requests.Session, limiter: RateLimiter) -> tuple[list[dict], int]:
    index_xml, _ = fetch_text(session, SITEMAP_INDEX_URL, limiter)
    map_urls = sorted(
        (url for url in sitemap_children(index_xml) if RECIPE_SITEMAP_PATH.fullmatch(urlparse(url).path)),
        key=lambda url: int(re.search(r"(\d+)\.xml$", urlparse(url).path).group(1)),
    )
    if not map_urls:
        raise RuntimeError("The sitemap index did not contain any monan-sitemap*.xml files.")

    by_url: dict[str, dict] = {}
    for sitemap_url in map_urls:
        sitemap_xml, _ = fetch_text(session, sitemap_url, limiter)
        root = ET.fromstring(sitemap_xml)
        for node in root:
            if local_name(node.tag) != "url":
                continue
            loc = next((child.text.strip() for child in node if local_name(child.tag) == "loc" and child.text), "")
            parsed = urlparse(loc)
            if parsed.scheme != "https" or parsed.netloc != urlparse(BASE_URL).netloc:
                continue
            canonical_url = urlunparse(parsed._replace(query="", fragment=""))
            if parsed.path == RECIPE_ARCHIVE_PATH:
                continue
            if not parsed.path.startswith("/") or not parsed.path.endswith("/"):
                continue
            lastmod = next((child.text.strip() for child in node if local_name(child.tag) == "lastmod" and child.text), None)
            by_url.setdefault(canonical_url, {
                "url": canonical_url,
                "lastmod": lastmod,
                "sitemap": urlparse(sitemap_url).path,
            })
    return list(by_url.values()), len(map_urls)


def find_recipe_objects(value: object):
    if isinstance(value, list):
        for child in value:
            yield from find_recipe_objects(child)
    elif isinstance(value, dict):
        recipe_type = value.get("@type", [])
        if isinstance(recipe_type, str):
            recipe_type = [recipe_type]
        if "Recipe" in recipe_type:
            yield value
            return
        for child in value.values():
            yield from find_recipe_objects(child)


def parse_recipe_jsonld(soup: BeautifulSoup) -> tuple[dict | None, list[str]]:
    errors: list[str] = []
    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        raw = script.string or script.get_text()
        if not raw.strip():
            continue
        try:
            value = json.loads(raw, strict=False)
        except (json.JSONDecodeError, TypeError) as error:
            errors.append(str(error))
            continue
        recipe = next(find_recipe_objects(value), None)
        if recipe:
            return recipe, errors
    return None, errors


def element_lines(element: Tag | None) -> list[str]:
    if not element:
        return []
    lines: list[str] = []
    for child in element.select("p, li"):
        if child.find_parent("li") and child.name == "p":
            continue
        value = clean_text(child.get_text(" ", strip=True))
        if value and (not lines or lines[-1] != value):
            lines.append(value)
    if not lines:
        value = clean_text(element.get_text(" ", strip=True))
        if value:
            lines.append(value)
    return lines


def parse_ingredient_views(soup: BeautifulSoup) -> dict[str, list[dict]]:
    section = soup.find(id=SECTION_IDS["ingredients"])
    if not section:
        return {}
    views: dict[str, list[dict]] = {}
    for view_name in ("muong", "gram"):
        container = section.find(id=f"tab-{view_name}")
        if not container:
            continue
        rows: list[dict] = []
        for item in container.select("li"):
            anchor = item.find("a", href=True)
            product_title = clean_text(anchor.get("title") or anchor.get_text(" ", strip=True)) if anchor else None
            raw = clean_text(item.get_text(" ", strip=True))
            if anchor:
                name = product_title or raw
                quantity = None
            else:
                span = item.find("span")
                raw_value = span.get_text(" ", strip=True) if span else raw
                pieces = re.split(r"\t+", raw_value, maxsplit=1)
                name = clean_text(pieces[0])
                quantity = clean_text(pieces[1]) if len(pieces) > 1 else None
            if not name:
                continue
            rows.append({
                "name": name,
                "quantity_raw": quantity,
                "raw": raw,
                "kind": "product" if anchor else "ingredient",
                "source_url": anchor.get("href") if anchor else None,
            })
        if rows:
            views[view_name] = rows
    return views


def parse_instruction_sections(soup: BeautifulSoup) -> list[dict]:
    sections = []
    for key in ("preparation", "cooking", "serving", "tips"):
        section = soup.find(id=SECTION_IDS[key])
        if not section:
            continue
        heading = section.find(["h2", "h3"])
        lines = element_lines(section)
        if heading:
            heading_text = clean_text(heading.get_text(" ", strip=True)).rstrip(":")
            heading_line = clean_text(heading.get_text(" ", strip=True))
            lines = [line for line in lines if line != heading_line]
        else:
            heading_text = key
        sections.append({
            "key": key,
            "name": heading_text,
            "text": clean_text(section.get_text(" ", strip=True)),
            "steps": lines,
        })
    return sections


def recipe_type_text(value: object) -> list[str]:
    if isinstance(value, list):
        return [clean_text(item) for item in value if clean_text(item)]
    if value is None:
        return []
    return [clean_text(value)]


def parse_detail(url: str, sitemap_record: dict, html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    structured, jsonld_errors = parse_recipe_jsonld(soup)
    h1 = soup.find("h1")
    title = clean_text((structured or {}).get("name")) or clean_text(h1.get_text(" ", strip=True) if h1 else "")
    if not title:
        raise ValueError("Page has no recipe JSON-LD title or h1.")

    ingredient_views = parse_ingredient_views(soup)
    primary_view = ingredient_views.get("gram") or ingredient_views.get("muong") or []
    instruction_sections = parse_instruction_sections(soup)
    image = (structured or {}).get("image")
    if not image:
        image = [img.get("src") for img in soup.select("img.img_detail_monan[src]") if img.get("src")]
    if isinstance(image, str):
        image = [image]
    slug = urlparse(url).path.strip("/").split("/")[-1]

    instructions = (structured or {}).get("recipeInstructions", [])
    if isinstance(instructions, str):
        instructions = [{"text": instructions}]
    tags = [clean_text(item.get_text(" ", strip=True)) for item in soup.select("ul.tags li") if clean_text(item.get_text(" ", strip=True))]

    warnings = []
    if not structured:
        warnings.append("missing_recipe_jsonld")
    if not primary_view:
        warnings.append("missing_html_ingredients")
    if not any(section.get("steps") for section in instruction_sections):
        warnings.append("missing_html_instruction_sections")
    if jsonld_errors:
        warnings.append("malformed_jsonld_other_blocks")

    return {
        "schema_version": 1,
        "id": f"monngonmoingay:{slug}",
        "slug": slug,
        "name": title,
        "description": clean_text((structured or {}).get("description")),
        "source_url": url,
        "source": "Món Ngon Mỗi Ngày",
        "sitemap_lastmod": sitemap_record.get("lastmod"),
        "sitemap_file": sitemap_record.get("sitemap"),
        "author": clean_text(((structured or {}).get("author") or {}).get("name")) or None,
        "date_published": (structured or {}).get("datePublished"),
        "image_urls": image,
        "prep_time": (structured or {}).get("prepTime"),
        "cook_time": (structured or {}).get("cookTime"),
        "total_time": (structured or {}).get("totalTime"),
        "servings": (structured or {}).get("recipeYield"),
        "rating": (structured or {}).get("aggregateRating"),
        "category": recipe_type_text((structured or {}).get("recipeCategory")),
        "cuisine": recipe_type_text((structured or {}).get("recipeCuisine")),
        "keywords": recipe_type_text((structured or {}).get("keywords")),
        "ingredients": primary_view,
        "ingredient_views": ingredient_views,
        "structured_ingredients": recipe_type_text((structured or {}).get("recipeIngredient")),
        "instruction_sections": instruction_sections,
        "structured_instructions": instructions,
        "tags": tags,
        "warnings": warnings,
        "fetched_at": now_utc(),
    }


def load_completed_urls(recipes_path: Path) -> set[str]:
    done: set[str] = set()
    if not recipes_path.exists():
        return done
    with recipes_path.open("r", encoding="utf-8") as stream:
        for line in stream:
            try:
                record = json.loads(line)
                if record.get("source_url"):
                    done.add(record["source_url"])
            except json.JSONDecodeError:
                continue
    return done


def write_json_atomic(path: Path, payload: object) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def append_jsonl(path: Path, payload: dict) -> None:
    with path.open("a", encoding="utf-8") as stream:
        stream.write(json.dumps(payload, ensure_ascii=False) + "\n")
        stream.flush()


def build_quality_report(recipes_path: Path, failures_path: Path, discovered_count: int) -> dict:
    records = []
    if recipes_path.exists():
        with recipes_path.open("r", encoding="utf-8") as stream:
            for line in stream:
                try:
                    records.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    failures = []
    if failures_path.exists():
        with failures_path.open("r", encoding="utf-8") as stream:
            for line in stream:
                try:
                    failures.append(json.loads(line))
                except json.JSONDecodeError:
                    continue

    warning_counts = Counter(warning for record in records for warning in record.get("warnings", []))
    unique_ingredients = {
        clean_text(item.get("name")).casefold()
        for record in records
        for item in record.get("ingredients", [])
        if clean_text(item.get("name")) and item.get("kind") != "product"
    }
    unique_products = {
        clean_text(item.get("name")).casefold()
        for record in records
        for item in record.get("ingredients", [])
        if clean_text(item.get("name")) and item.get("kind") == "product"
    }
    section_counts = Counter(
        section.get("key")
        for record in records
        for section in record.get("instruction_sections", [])
        if section.get("key") and section.get("steps")
    )
    url_counts = Counter(record.get("source_url") for record in records if record.get("source_url"))
    title_counts = Counter(clean_text(record.get("name")).casefold() for record in records if record.get("name"))
    examples = {
        "missing_recipe_jsonld": [],
        "missing_html_ingredients": [],
        "missing_html_instruction_sections": [],
    }
    for record in records:
        for warning in examples:
            if warning in record.get("warnings", []) and len(examples[warning]) < 10:
                examples[warning].append(record.get("source_url"))

    return {
        "generated_at": now_utc(),
        "source": "Món Ngon Mỗi Ngày",
        "discovered_recipe_urls": discovered_count,
        "exported_records": len(records),
        "failed_requests_logged": len(failures),
        "missing_records_vs_discovery": max(0, discovered_count - len(url_counts)),
        "duplicate_source_url_records": sum(count - 1 for count in url_counts.values() if count > 1),
        "unique_recipe_names": len(title_counts),
        "duplicate_name_groups": sum(1 for count in title_counts.values() if count > 1),
        "unique_ingredient_names": len(unique_ingredients),
        "unique_linked_product_names": len(unique_products),
        "records_with_ingredients": sum(bool(record.get("ingredients")) for record in records),
        "records_with_gram_view": sum(bool(record.get("ingredient_views", {}).get("gram")) for record in records),
        "records_with_muong_view": sum(bool(record.get("ingredient_views", {}).get("muong")) for record in records),
        "records_with_instruction_sections": sum(any(section.get("steps") for section in record.get("instruction_sections", [])) for record in records),
        "records_with_instruction_section_nodes": sum(bool(record.get("instruction_sections")) for record in records),
        "instruction_section_counts": dict(section_counts),
        "warning_counts": dict(warning_counts),
        "warning_examples": examples,
        "recipe_jsonl": str(recipes_path),
        "failures_jsonl": str(failures_path),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Crawl the public MNMN recipe sitemap and export Recipe records.")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--delay-seconds", type=float, default=0.35, help="Minimum delay between GET requests (default: 0.35).")
    parser.add_argument("--limit", type=int, default=0, help="Fetch at most this many URLs in this run; 0 means all remaining URLs.")
    parser.add_argument("--refresh-links", action="store_true", help="Refresh links.json from the live sitemap index.")
    parser.add_argument("--refetch", action="store_true", help="Fetch pages even when a successful record already exists.")
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    recipes_path = args.output_dir / "recipes.jsonl"
    failures_path = args.output_dir / "failures.jsonl"
    links_path = args.output_dir / "links.json"
    summary_path = args.output_dir / "summary.json"
    failures_path.touch(exist_ok=True)
    session = make_session()
    limiter = RateLimiter(args.delay_seconds)

    if links_path.exists() and not args.refresh_links:
        manifest = json.loads(links_path.read_text(encoding="utf-8"))
        urls = manifest["records"]
        sitemap_count = manifest["sitemap_count"]
    else:
        urls, sitemap_count = discover_recipe_urls(session, limiter)
        manifest = {
            "source": SITEMAP_INDEX_URL,
            "generated_at": now_utc(),
            "sitemap_count": sitemap_count,
            "unique_recipe_url_count": len(urls),
            "records": urls,
        }
        write_json_atomic(links_path, manifest)

    completed = set() if args.refetch else load_completed_urls(recipes_path)
    pending = [row for row in urls if row["url"] not in completed]
    if args.limit > 0:
        pending = pending[: args.limit]
    logging.info(
        "Sitemaps=%d URLs=%d completed=%d pending_this_run=%d delay=%.2fs",
        sitemap_count, len(urls), len(completed), len(pending), args.delay_seconds,
    )

    success_count = len(completed)
    run_success = 0
    run_failures = 0
    for index, sitemap_record in enumerate(pending, start=1):
        url = sitemap_record["url"]
        try:
            html, response = fetch_text(session, url, limiter)
            recipe = parse_detail(url, sitemap_record, html)
            recipe["http_status"] = response.status_code
            recipe["content_type"] = response.headers.get("Content-Type")
            append_jsonl(recipes_path, recipe)
            success_count += 1
            run_success += 1
        except Exception as error:
            failure = {
                "source_url": url,
                "sitemap_file": sitemap_record.get("sitemap"),
                "error": str(error),
                "failed_at": now_utc(),
            }
            append_jsonl(failures_path, failure)
            run_failures += 1
            logging.warning("[%d/%d] failed %s: %s", index, len(pending), url, error)

        if index % 25 == 0 or index == len(pending):
            logging.info("[%d/%d] success_this_run=%d failures_this_run=%d", index, len(pending), run_success, run_failures)

    summary = {
        "source": "Món Ngon Mỗi Ngày",
        "sitemap_index": SITEMAP_INDEX_URL,
        "generated_at": now_utc(),
        "sitemap_count": sitemap_count,
        "discovered_recipe_urls": len(urls),
        "previously_completed": len(completed),
        "success_this_run": run_success,
        "failures_this_run": run_failures,
        "total_success_records": success_count,
        "recipes_jsonl": str(recipes_path),
        "links_json": str(links_path),
        "failures_jsonl": str(failures_path),
        "quality_report": str(args.output_dir / "quality-report.json"),
        "resume_hint": "Run the same command again; successful source URLs are skipped automatically.",
    }
    write_json_atomic(summary_path, summary)
    write_json_atomic(args.output_dir / "quality-report.json", build_quality_report(recipes_path, failures_path, len(urls)))
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if run_failures == 0 else 1


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    sys.exit(main())
