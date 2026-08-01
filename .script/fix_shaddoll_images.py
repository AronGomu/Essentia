from pathlib import Path
import re, urllib.parse, requests, time

from PIL import Image, ImageOps

from original_image_assets import original_image_path, safe_slug

REPO_ROOT = Path(__file__).resolve().parents[1]
ROOT = REPO_ROOT / 'cards_mse' / '00_drafts'
PROJECTS = [ROOT / '02_shaddoll' / '02_YGO_Shaddoll.mse-set']
API = 'https://db.ygoprodeck.com/api/v7/cardinfo.php?name='

NAME_MAP = {
    'Curse of the Shadow Prison': 'Curse of the Shadow Prison',
    'El Shaddoll - Anoyatyllis': 'El Shaddoll Anoyatyllis',
    'El Shaddoll - Apkallone': 'El Shaddoll Apkallone',
    'El Shaddoll - Construct': 'El Shaddoll Construct',
    'El Shaddoll - Fusion': 'El Shaddoll Fusion',
    'El Shaddoll - Grysta': 'El Shaddoll Grysta',
    'El Shaddoll - Shekhinaga': 'El Shaddoll Shekhinaga',
    'El Shaddoll - Wendigo': 'El Shaddoll Wendigo',
    'El Shaddoll - Winda': 'El Shaddoll Winda',
    'Hel Shaddoll - Hollow': 'Helshaddoll Hollow',
    'Nael Shaddoll - Ariel': 'Naelshaddoll Ariel',
    'Puru Shaddoll - Aeon': 'Purushaddoll Aeon',
    'Qad Shaddoll - Keios': 'Qadshaddoll Keios',
    'Ree Shaddoll - Wendi': 'Reeshaddoll Wendi',
    'Resh Shaddoll - Incarnation': 'Resh Shaddoll Incarnation',
    'Shaddoll - Beast': 'Shaddoll Beast',
    'Shaddoll - Core': 'Shaddoll Core',
    'Shaddoll - Dragon': 'Shaddoll Dragon',
    'Shaddoll - Falco': 'Shaddoll Falco',
    'Shaddoll - Fusion': 'Shaddoll Fusion',
    'Shaddoll - Hedgehog': 'Shaddoll Hedgehog',
    'Shaddoll - Hound': 'Shaddoll Hound',
    'Shaddoll - Schism': 'Shaddoll Schism',
    'Shaddoll - Squamata': 'Shaddoll Squamata',
    'Sinister Shadow Games': 'Sinister Shadow Games',
}

def name_of(text):
    m = re.search(r'(?m)^\s*name:\s*(.+)$', text)
    return m.group(1).strip() if m else None

def download(query):
    r = requests.get(API + urllib.parse.quote(query), timeout=30)
    r.raise_for_status()
    data = r.json()['data'][0]
    out = original_image_path(data)
    if not out.exists():
        url = data['card_images'][0].get('image_url_cropped') or data['card_images'][0]['image_url']
        img = requests.get(url, timeout=45)
        img.raise_for_status()
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(img.content)
    return data, out


def resize_cover(source, output, width=316, height=231):
    output.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image).convert('RGB')
        scale = max(width / image.width, height / image.height)
        resized = image.resize(
            (round(image.width * scale), round(image.height * scale)),
            Image.Resampling.LANCZOS,
        )
        left = (resized.width - width) // 2
        top = (resized.height - height) // 2
        resized.crop((left, top, left + width, top + height)).save(output, 'PNG')

def set_image_in_text(text, rel):
    lines = text.splitlines()
    for i, line in enumerate(lines):
        if re.match(r'^\s*image:\s*', line):
            indent = line.split('image:', 1)[0]
            lines[i] = f'{indent}image: {rel}'
            # remove accidental orphan image path line after image field, if present
            if i + 1 < len(lines) and re.match(r'^\s*images/', lines[i + 1]):
                del lines[i + 1]
            return '\n'.join(lines) + '\n'
    return text.rstrip() + f'\n\timage: {rel}\n'

errors = []
for project in PROJECTS:
    if not project.exists():
        continue
    files = sorted(project.glob('card *'))
    for card in files:
        text = card.read_text(encoding='utf-8-sig', errors='replace')
        display = name_of(text)
        if not display:
            continue
        query = NAME_MAP.get(display, display)
        try:
            data, source = download(query)
            time.sleep(0.15)
        except Exception as e:
            errors.append(f'{display} -> {query}: {e}')
            print('ERROR | ' + errors[-1])
            continue
        current = re.search(r'(?m)^\s*image:\s*(.+?)\s*$', text)
        current_value = current.group(1) if current else ''
        current_path = project / current_value if current_value else None
        if current_value.startswith('mse_images/') and current_path and current_path.is_file():
            continue
        output = project / 'mse_images' / f'{safe_slug(data["name"])}.png'
        resize_cover(source, output)
        rel = output.relative_to(project).as_posix()
        new = set_image_in_text(text, rel)
        if new != text:
            card.write_text(new, encoding='utf-8')
            print(f'LINKED | {card.relative_to(ROOT)} | {rel}')

if errors:
    raise SystemExit('\n'.join(errors))
