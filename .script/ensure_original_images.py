from pathlib import Path
import re, sys, time
import requests

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / '.script'))
from original_card_names import NAME_MAP
from original_image_assets import original_image_path

ROOT = Path(__file__).resolve().parent
API = 'https://db.ygoprodeck.com/api/v7/cardinfo.php'

def card_name(text):
    m = re.search(r'(?m)^\s*name:\s*(.+)$', text)
    return m.group(1).strip() if m else None

def fetch(query):
    for key in ('name', 'fname'):
        r = requests.get(API, params={key: query}, timeout=30)
        if r.status_code == 400:
            continue
        r.raise_for_status()
        data = r.json().get('data', [])
        if data:
            exact = [c for c in data if c['name'].lower() == query.lower()]
            return exact[0] if exact else data[0]
    raise RuntimeError(f'not found: {query}')

errors=[]
for project in sorted(ROOT.glob('*.mse-set')):
    downloaded = 0
    set_text = (project/'set').read_text(encoding='utf-8-sig', errors='replace') if (project/'set').exists() else ''
    includes = re.findall(r'(?m)^include_file:\s*(.+)$', set_text)
    card_files = [project/i.strip() for i in includes] if includes else list(project.glob('card *'))
    for card_file in card_files:
        if not card_file.exists():
            continue
        text = card_file.read_text(encoding='utf-8-sig', errors='replace')
        display = card_name(text)
        if not display:
            continue
        query = NAME_MAP.get(display, display)
        try:
            data = fetch(query)
            out = original_image_path(data)
            if out.exists():
                continue
            url = data['card_images'][0].get('image_url_cropped') or data['card_images'][0]['image_url']
            img = requests.get(url, timeout=45)
            img.raise_for_status()
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_bytes(img.content)
            downloaded += 1
            print(f'DOWNLOADED | {project.name} | {display} -> {out.relative_to(REPO_ROOT)}')
            time.sleep(0.1)
        except Exception as e:
            errors.append(f'{project.name} | {display} -> {query}: {e}')
            print('ERROR | ' + errors[-1])
    print(f'{project.name}: downloaded={downloaded}')
if errors:
    print('\nFAILED:')
    for e in errors:
        print('- ' + e)
    raise SystemExit(1)
