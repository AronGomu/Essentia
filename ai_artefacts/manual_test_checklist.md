# Manual test checklist

## T1 — Header Cards link + hero crop

- [ ] 400 px home header: automated Chromium proxy confirms Cards visible, first, home-bound, inline, accessible, zero horizontal overflow.
- [ ] 400 px inner-route header: automated Chromium proxy confirms one row, Cards directly before Learn, zero horizontal overflow.
- [ ] Home hero crop: CSS resolution proxy confirms `.hero-art` uses `object-position: center 0%` at 1440 px + 400 px, keeping Trishula head at image top.
- [ ] Base-path root: built home utility nav confirms Cards `href="/YGO-x-MTG/"`.
- [ ] Publication rights: exact generated inventory approved — 100 records total, 50 display + 50 print; no render byte diffs.

Evidence: focused Vitest 138/138; focused Chromium Playwright 26/26; base-path build exit 0; `npm run ci` 74 files + 780 tests pass.

## T2 — Blog chapter summary

- [ ] Desktop `/blog/` and `/blog/lota-alpha-v0-1-presentation/`: chapter summary appears right of prose.
- [ ] 900 px blog post: chapter summary appears above prose.
- [ ] Click several chapter links: URL hash matches heading and target clears sticky header.
- [ ] Blog canonical URLs: `/blog/` points to latest post; post route stays self-canonical.
- [ ] Post without H2: one-column shell appears with no empty chapter summary.

## T3 — Remove four archetype affinities

- [ ] Open Tour Guide From the Underworld: card stays visible under Non-archetype with no Burning Abyss relation.
- [ ] Open Preparation of Rites: card stays visible under Non-archetype with no Nekroz relation.
- [ ] Open Manju of the Ten Thousand Hands: card stays visible under Non-archetype with no Nekroz relation.
- [ ] Open Senju of the Thousand Hands: card stays visible under Non-archetype with no Nekroz relation.
- [ ] Open Burning Abyss and Nekroz members: Same archetype galleries still render their printed-name members.

## T4 — Sharp archetype backdrops

- [ ] Open Burning Abyss archetype: backdrop photo looks sharp under 60% black veil; cards and text remain legible.
- [ ] Open Nekroz archetype: backdrop photo looks sharp under 60% black veil; cards and text remain legible.
- [ ] At 400 px, confirm backdrop stays clipped to content column with no horizontal overflow.
- [ ] Open Nekroz card route: no archetype photo backdrop appears outside archetype page.
- [ ] Check home, header, blog, card, and archetype routes: T1–T4 behavior remains functional.
