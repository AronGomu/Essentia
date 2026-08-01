from pathlib import Path
import re
import time
import urllib.parse

import requests
from PIL import Image, ImageOps

from original_image_assets import original_image_path, safe_slug

REPO_ROOT = Path(__file__).resolve().parents[1]
ROOT = REPO_ROOT / "cards_mse" / "00_drafts"
API = "https://db.ygoprodeck.com/api/v7/cardinfo.php?name="

NAME_MAP = {
    # Burning Abyss: official Yu-Gi-Oh names
    "Alich, Burning Abyss": "Alich, Malebranche of the Burning Abyss",
    "Barbar, Burning Abyss": "Barbar, Malebranche of the Burning Abyss",
    "Cagna, Burning Abyss": "Cagna, Malebranche of the Burning Abyss",
    "Calcab, Burning Abyss": "Calcab, Malebranche of the Burning Abyss",
    "Cir, Burning Abyss": "Cir, Malebranche of the Burning Abyss",
    "Draghig, Burning Abyss": "Draghig, Malebranche of the Burning Abyss",
    "Farfa, Burning Abyss": "Farfa, Malebranche of the Burning Abyss",
    "Graff, Burning Abyss": "Graff, Malebranche of the Burning Abyss",
    "Libic, Burning Abyss": "Libic, Malebranche of the Burning Abyss",
    "Rubic, Burning Abyss": "Rubic, Malebranche of the Burning Abyss",
    "Scarm, Burning Abyss": "Scarm, Malebranche of the Burning Abyss",
    "Dante, Traveller of the Burning Abyss": "Dante, Traveler of the Burning Abyss",
    "Dante, Voyageur de l'Abîme Ardent": "Dante, Traveler of the Burning Abyss",
    "Virgil, Rock Star of the Burning Abyss": "Virgil, Rock Star of the Burning Abyss",
    "Beatrice, Lady of the Eternal": "Beatrice, Lady of the Eternal",
    "Fire Lake of the Burning Abyss": "Fire Lake of the Burning Abyss",

    # French utility card names -> official English names
    "Compétence de Percée": "Breakthrough Skill",
    "D.D Crow": "D.D. Crow",
    "Dispositif d'Évacuation Obligatoire": "Compulsory Evacuation Device",
    "Double Tornade": "Twin Twisters",
    "Enterrement Précipité": "Foolish Burial",
    "Explosion Ailée du Phénix": "Phoenix Wing Wind Blast",
    "Fusion Instantanée": "Instant Fusion",
    "Gobelin Parvenu": "Upstart Goblin",
    "Guide des Enfers": "Tour Guide From the Underworld",
    "Hommage Torrentiel": "Torrential Tribute",
    "Livre de l'Éclipse": "Book of Eclipse",
    "Livre de la Lune": "Book of Moon",
    "Mathématicien": "Mathematician",
    "Maxx « C »": "Maxx \"C\"",
    "Préparation des Rites": "Preparation of Rites",
    "Renaissance du Monstre": "Monster Reborn",
    "Super Polymérisation": "Super Polymerization",
    "Séduction des Ténèbres": "Allure of Darkness",
    "Trou Noir": "Dark Hole",
    "Typhon d'Espace Mystique": "Mystical Space Typhoon",
}

def get_name(text: str) -> str | None:
    m = re.search(r"(?m)^\s*name:\s*(.+)$", text)
    return m.group(1).strip() if m else None

def fetch_and_store_original(card_name: str) -> tuple[dict, Path]:
    response = requests.get(API + urllib.parse.quote(card_name), timeout=30)
    response.raise_for_status()
    data = response.json()["data"][0]
    destination = original_image_path(data)
    if not destination.exists():
        image_url = data["card_images"][0].get("image_url_cropped") or data["card_images"][0]["image_url"]
        image_response = requests.get(image_url, timeout=45)
        image_response.raise_for_status()
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(image_response.content)
    return data, destination


def resize_cover(source: Path, output: Path, width: int = 316, height: int = 231) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image).convert("RGB")
        scale = max(width / image.width, height / image.height)
        resized = image.resize(
            (round(image.width * scale), round(image.height * scale)),
            Image.Resampling.LANCZOS,
        )
        left = (resized.width - width) // 2
        top = (resized.height - height) // 2
        resized.crop((left, top, left + width, top + height)).save(output, "PNG")


errors = []
updated = 0
for project in sorted(ROOT.glob("*/*_YGO_*.mse-set")):
    # Burning Abyss uses reconciled MSE imports and must not be rewritten to source JPG paths.
    if project.name == "01_YGO_Burning_Abyss.mse-set":
        continue
    for card_file in sorted(project.glob("card *")):
        text = card_file.read_text(encoding="utf-8-sig", errors="replace")
        display = get_name(text)
        if not display:
            continue
        query = NAME_MAP.get(display, display)
        try:
            data, source = fetch_and_store_original(query)
            print(f"SOURCE | {project.name} | {display} -> {source.relative_to(REPO_ROOT)}")
            time.sleep(0.15)
        except Exception as e:
            errors.append(f"{project.name} | {display} -> {query} | {e}")
            print("ERROR | " + errors[-1])
            continue

        lines = text.splitlines()
        image_index = next(
            (i for i, line in enumerate(lines) if re.match(r"^\s*image:\s*", line)),
            None,
        )
        current_value = ""
        if image_index is not None:
            current_value = lines[image_index].split("image:", 1)[1].strip()
        current_path = project / current_value if current_value else None
        if current_value.startswith("mse_images/") and current_path and current_path.is_file():
            continue

        output = project / "mse_images" / f"{safe_slug(data['name'])}.png"
        resize_cover(source, output)
        rel = output.relative_to(project).as_posix()
        if image_index is None:
            lines.append(f"\timage: {rel}")
        else:
            indent = lines[image_index].split("image:", 1)[0]
            lines[image_index] = f"{indent}image: {rel}"
        card_file.write_text("\n".join(lines) + "\n", encoding="utf-8")
        updated += 1
        print(f"UPDATED | {card_file.relative_to(ROOT)} | image: {rel}")

print(f"Done. Updated {updated} card files.")
if errors:
    print("FAILED:")
    for e in errors:
        print("- " + e)
    raise SystemExit(1)
