#!/usr/bin/env python3
"""Fetch public cooking-tip articles from Knorr's Vietnamese tips category."""
from __future__ import annotations

import argparse
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup, Tag

CATEGORY_URL = "https://www.knorr.com/vn/bai-viet/cach-nau-an-ngon.html"
OUTPUT = Path(__file__).resolve().parents[1] / "data-archive" / "knorr_tips_source" / "tips.json"
HEADERS = {"User-Agent": "NauDaiTipsImporter/1.0", "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.5"}


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def article_links(soup: BeautifulSoup) -> list[str]:
    links: list[str] = []
    for anchor in soup.select('main a[href*="/bai-viet/cach-nau-an-ngon/"]'):
        href = urljoin(CATEGORY_URL, anchor.get("href", "")).split("#", 1)[0]
        parsed = urlparse(href)
        if parsed.netloc != "www.knorr.com" or parsed.path.rstrip("/") == urlparse(CATEGORY_URL).path.rstrip("/"):
            continue
        if href not in links:
            links.append(href)
    return links


def article_tips(url: str, session: requests.Session) -> dict:
    response = session.get(url, timeout=30)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    main = soup.find("main") or soup
    heading = main.find("h1")
    title = clean(heading.get_text(" ", strip=True)) if heading else ""
    if not title:
        raise ValueError("Article is missing an h1")
    image = main.select_one("img[src]")
    image_url = urljoin(url, image.get("src", "")) if image else None
    tips = []
    for section_heading in main.find_all(["h2", "h3"]):
        label = clean(section_heading.get_text(" ", strip=True))
        if not label or label.lower() == title.lower():
            continue
        paragraphs = []
        for node in section_heading.next_elements:
            if isinstance(node, Tag) and node.name in {"h1", "h2", "h3"}:
                break
            if isinstance(node, Tag) and node.name in {"p", "li"}:
                text = clean(node.get_text(" ", strip=True))
                if text and text not in paragraphs:
                    paragraphs.append(text)
        summary = " ".join(paragraphs[:2]).strip()
        if len(summary) >= 28:
            tips.append({"title": label, "text": summary})
    if not tips:
        description = soup.select_one('meta[name="description"]')
        summary = clean(description.get("content", "")) if description else ""
        if len(summary) >= 28:
            tips.append({"title": title, "text": summary})
    if not tips:
        raise ValueError("Article has no readable tip sections")
    return {"id": urlparse(url).path.rstrip("/").split("/")[-1], "title": title, "url": url, "image_url": image_url, "tips": tips}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument("--delay-seconds", type=float, default=0.5)
    args = parser.parse_args()
    session = requests.Session()
    session.headers.update(HEADERS)
    page = session.get(CATEGORY_URL, timeout=30)
    page.raise_for_status()
    urls = article_links(BeautifulSoup(page.text, "html.parser"))
    if not urls:
        raise RuntimeError("No Knorr tip articles were discovered from the category page")
    articles, failures = [], []
    for index, url in enumerate(urls):
        try:
            articles.append(article_tips(url, session))
        except Exception as error:
            failures.append({"url": url, "error": str(error)})
        if index + 1 < len(urls):
            time.sleep(max(0, args.delay_seconds))
    if not articles:
        raise RuntimeError(f"No Knorr tip articles could be parsed: {failures}")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    previous = {}
    if args.output.exists():
        try:
            previous = {item["id"]: item for item in json.loads(args.output.read_text(encoding="utf-8")).get("articles", []) if item.get("id")}
        except (OSError, json.JSONDecodeError):
            previous = {}
    merged = {**previous, **{item["id"]: item for item in articles}}
    payload = {"source": "Knorr Việt Nam", "category_url": CATEGORY_URL, "fetched_at": datetime.now(timezone.utc).isoformat(), "articles": list(merged.values()), "failures": failures}
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"articles": len(articles), "tips": sum(len(item["tips"]) for item in articles), "failures": len(failures), "output": str(args.output)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
