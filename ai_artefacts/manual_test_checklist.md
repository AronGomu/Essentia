# Manual test checklist

## T1 — Header Cards link + hero crop

- [x] 400 px home header: automated Chromium proxy confirms Cards visible, first, home-bound, inline, accessible, zero horizontal overflow.
- [x] 400 px inner-route header: automated Chromium proxy confirms one row, Cards directly before Learn, zero horizontal overflow.
- [x] Home hero crop: CSS resolution proxy confirms `.hero-art` uses `object-position: center 0%` at 1440 px + 400 px, keeping Trishula head at image top.
- [x] Base-path root: built home utility nav confirms Cards `href="/YGO-x-MTG/"`.
- [x] Publication rights: exact generated inventory approved — 100 records total, 50 display + 50 print; no render byte diffs.

Evidence: focused Vitest 138/138; focused Chromium Playwright 26/26; base-path build exit 0; `npm run ci` 74 files + 780 tests pass.
