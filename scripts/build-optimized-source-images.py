import json
import os
import io
import urllib.request
from PIL import Image

ROOT = os.getcwd()
KNORR_HOME_JSON = os.path.join(ROOT, "public/data/knorr/home-recommendations.json")
MNNM_RECENT_JSON = os.path.join(ROOT, "public/data/mnnm/recent.json")
OUTPUT_MANIFEST_JSON = os.path.join(ROOT, "public/data/source-recipe-image-manifest.json")

def process_image(img_bytes, base_name, out_dir):
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    
    # 1. Detail (max 720 width)
    detail_w = min(720, img.width)
    detail_h = int(img.height * (detail_w / img.width))
    img_detail = img.resize((detail_w, detail_h), Image.Resampling.LANCZOS)
    detail_rel = f"{out_dir}/{base_name}-detail.webp"
    detail_path = os.path.join(ROOT, "public", detail_rel)
    img_detail.save(detail_path, "WEBP", quality=82)
    
    # 2. Card (360 width)
    card_w = min(360, img.width)
    card_h = int(img.height * (card_w / img.width))
    img_card = img.resize((card_w, card_h), Image.Resampling.LANCZOS)
    card_rel = f"{out_dir}/{base_name}-card.webp"
    card_path = os.path.join(ROOT, "public", card_rel)
    img_card.save(card_path, "WEBP", quality=80)
    
    # 3. Thumb (128x128 center crop)
    thumb_size = 128
    min_dim = min(img.width, img.height)
    left = (img.width - min_dim) // 2
    top = (img.height - min_dim) // 2
    img_thumb = img.crop((left, top, left + min_dim, top + min_dim)).resize((thumb_size, thumb_size), Image.Resampling.LANCZOS)
    thumb_rel = f"{out_dir}/{base_name}-thumb.webp"
    thumb_path = os.path.join(ROOT, "public", thumb_rel)
    img_thumb.save(thumb_path, "WEBP", quality=75)
    
    return {
        "thumbPath": f"/{thumb_rel}",
        "cardImagePath": f"/{card_rel}",
        "imagePath": f"/{detail_rel}"
    }

def main():
    records = []
    
    # Process MNNM Recent
    if os.path.exists(MNNM_RECENT_JSON):
        with open(MNNM_RECENT_JSON) as f:
            mnnm = json.load(f)
        for r in mnnm.get("recipes", []):
            url = r.get("image_url")
            r_id = r.get("id")
            if not url or not r_id:
                continue
            slug = r_id.split(":")[-1]
            card_file = os.path.join(ROOT, "public/images/sources/mnnm", f"{slug}-card.webp")
            if os.path.exists(card_file):
                records.append({
                    "source": "mnnm",
                    "recipeId": r_id,
                    "thumbPath": f"/images/sources/mnnm/{slug}-thumb.webp",
                    "cardImagePath": f"/images/sources/mnnm/{slug}-card.webp",
                    "imagePath": f"/images/sources/mnnm/{slug}-detail.webp",
                    "sourceUrl": url
                })
                continue
            try:
                print(f"Fetching MNNM {r_id}: {url}")
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=10) as resp:
                    data = resp.read()
                paths = process_image(data, slug, "images/sources/mnnm")
                records.append({
                    "source": "mnnm",
                    "recipeId": r_id,
                    **paths,
                    "sourceUrl": url
                })
                print(f"Done MNNM {r_id}")
            except Exception as e:
                print(f"Error MNNM {r_id}: {e}")

    # Process Knorr Home Recommendations
    if os.path.exists(KNORR_HOME_JSON):
        with open(KNORR_HOME_JSON) as f:
            knorr = json.load(f)
        for r in knorr:
            r_id = r.get("id")
            if not r_id:
                continue
            slug = r_id.split(":")[-1]
            card_file = os.path.join(ROOT, "public/images/sources/knorr", f"{slug}-card.webp")
            if os.path.exists(card_file):
                records.append({
                    "source": "knorr",
                    "recipeId": r_id,
                    "thumbPath": f"/images/sources/knorr/{slug}-thumb.webp",
                    "cardImagePath": f"/images/sources/knorr/{slug}-card.webp",
                    "imagePath": f"/images/sources/knorr/{slug}-detail.webp",
                    "sourceUrl": r.get("imageUrl")
                })
                continue
            
            urls = []
            if r.get("imageUrl"):
                urls.append(r["imageUrl"])
                urls.append(r["imageUrl"].replace("Resize=(1200,1200)", "Resize=(400,400)"))
            if r.get("imageFallbacks"):
                urls.extend(r["imageFallbacks"])
            
            downloaded = False
            for url in urls:
                try:
                    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                    with urllib.request.urlopen(req, timeout=8) as resp:
                        data = resp.read()
                    paths = process_image(data, slug, "images/sources/knorr")
                    records.append({
                        "source": "knorr",
                        "recipeId": r_id,
                        **paths,
                        "sourceUrl": url
                    })
                    print(f"Done Knorr {r_id} from {url}")
                    downloaded = True
                    break
                except Exception:
                    continue
            if not downloaded:
                print(f"Failed all URLs for Knorr {r_id}")

    with open(OUTPUT_MANIFEST_JSON, "w", encoding="utf-8") as f:
        json.dump({"updatedAt": "2026-11-18", "records": records}, f, ensure_ascii=False, indent=2)
    print(f"Wrote manifest with {len(records)} source image records to {OUTPUT_MANIFEST_JSON}")

if __name__ == "__main__":
    main()
