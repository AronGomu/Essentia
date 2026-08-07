# T11: Iconic section hero art

**Plan:** `./ai_artefacts/PLAN_2026_08_07_website-feedback-pass.md`
**Depends:** T1
**Commit outcome:** each section carries a committed hero image, converted once from the original Konami illustration of its iconic card, and the catalog exposes it as `section.heroImage`.

## Context (self-contained)

- Goal: ship the UX feedback backlog in `.dev/feedback.md`. Feedback **Home #1**, **Home #10** ("Replace image for each archetype card by HD upscaled original image of defined main magic cards"), **Archetype #1** ("Replace illustration image by HD upscaled original card, must be the same from archetype html card in home page").
- This slice: the assets plus the registry and catalog plumbing. Nothing renders them yet — the home page consumes `heroImage` in T12/T14, the archetype page in T16.
- Out of scope here: any page or component edit, the card render tiers under `public/generated/`, and the print pipeline. Do not touch `scripts/content/images.mjs`. **Do not call any generative image service** — no `grok-imagine`, no network, no API key. The HD upscale is a later, manual, human-supplied replacement of the committed file.
- Assumptions in force: hero images are produced once by a human-run command and committed, never at build time. Today the site's tiles use the 240 px `thumb` render, which is why they look soft; the original illustration is 624 px, so this ticket already gives 2.6× the pixels. The owner will drop in a true HD upscale later by overwriting the same `.webp` path — no code change required, only a provenance line update.

## Requirements

- Five committed images at `website/public/art/<section-slug>-hero.webp`, converted from the 624×624 original illustrations, no EXIF/ICC/XMP metadata, under 3 MiB.
- `website/content/sections.json` gains a required `heroImage` per section (site-absolute path, `/art/<slug>-hero.webp`).
- New authored file `website/content/art-provenance.json` recording, per hero image, the source illustration and the tool used.
- The build fails when a `heroImage` file is missing, when its provenance entry is missing, or when the path does not match `/^\/art\/[a-z0-9-]+-hero\.webp$/`.
- The build must **not** validate image dimensions — a later HD replacement at a larger size must pass unchanged.
- `CatalogSection` gains `heroImage: string`.

## Inputs

- `website/content/sections.json` — `schemaVersion: 2`, five entries with `group`, `slug`, `label`, `kind`, `order`, `accent`, `doc`, `iconicId`, and `namePattern` for archetypes. Slugs and iconic ids: `non-archetype`/`null`, `burning-abyss`/`burning-abyss-dante`, `shaddoll`/`el-shaddoll-construct`, `nekroz`/`nekroz-trishula`, `spellbook`/`high-priestess-of-prophecy`.
- `website/scripts/content/identity.mjs` — `loadRegistries()` validates every section field and calls `fail()` on anything unknown. Add the `heroImage` validation there.
- `website/scripts/content/orchestrator.mjs` — the `sections.push({...})` block near line 138 builds each catalog section (`slug, label, kind, accent, namePattern, intro, diagnostics, iconicId, route, count, latestModified, image, cardIds`). Add `heroImage: section.heroImage`. Leave the existing `image` field alone; it stays the thumb-tier render used for social cards.
- `website/src/lib/catalog.ts` — `export interface CatalogSection { … image: string; cardIds: string[] }`. Add `heroImage: string`.
- `website/scripts/scan-dist.mjs` — rejects any dist image carrying `exif`, `icc`, `iptc`, or `xmp` metadata, and any file whose extension is outside `.html .js .json .css .xml .txt .png .webp .avif .ico`. Do **not** put a README or any other extension inside `website/public/`.
- `website/scripts/check-budgets.mjs` — per-image ceiling 3 MiB, image total 180 MiB.
- `sharp` is already a `website/` dependency (used by `scripts/content/images.mjs`). Nothing new to install.
- Source illustrations, repo-root relative — each verified 624×624 JPEG, illustration crop only, no card frame:
  | Section | Source |
  | --- | --- |
  | `non-archetype` | `original_images/Effect Monster/Ash Blossom & Joyous Spring.jpg` |
  | `burning-abyss` | `original_images/Xyz/Dante, Traveler of the Burning Abyss.jpg` |
  | `shaddoll` | `original_images/Fusion/El Shaddoll Construct.jpg` |
  | `nekroz` | `original_images/Ritual/Nekroz of Trishula.jpg` |
  | `spellbook` | `original_images/Effect Monster/High Priestess of Prophecy.jpg` |
- **From Depends (T1):** `website/scripts/check-preflight.mjs` exists and exports `HERO_SOURCES`, a plain object mapping the five section slugs above to exactly those five repo-root-relative source paths. `npm run preflight` passes, which already asserts all five files are present. Reuse `HERO_SOURCES` in step 3 rather than retyping the paths.

## TDD

1. **Red** — write `website/tests/unit/section-art.test.ts` first against `assertHeroImage` exported from `website/scripts/content/identity.mjs`. Fails: export missing.
2. **Green** — add the validation, generate the assets, extend the registries, thread `heroImage` into the catalog.
3. **Refactor** — none.

Exact signature:

```js
/**
 * @param {{ slug: string, heroImage?: string }} section
 * @param {Set<string>} provenanceKeys keys present in content/art-provenance.json
 * @param {(relativeToPublic: string) => boolean} exists
 * @returns {void} calls fail() on any violation
 */
export function assertHeroImage(section, provenanceKeys, exists)
```

Failure messages (exact):

- `content: section <slug>: heroImage is required`
- `content: section <slug>: heroImage must match /art/<slug>-hero.webp`
- `content: section <slug>: heroImage file public<path> is missing`
- `content: section <slug>: heroImage has no entry in content/art-provenance.json`

`content/art-provenance.json` shape:

```json
{
  "schemaVersion": 1,
  "note": "Hero art is converted from the original Konami illustration with sharp. No generative service is used. Yu-Gi-Oh! remains property of its owners.",
  "art": [
    {
      "key": "/art/nekroz-hero.webp",
      "source": "original_images/Ritual/Nekroz of Trishula.jpg",
      "tool": "sharp webp q90 (native 624 px; HD upscale pending)",
      "generatedOn": "2026-08-07"
    }
  ]
}
```

## Test plan

| Test | Input | Expect |
| ---- | ----- | ------ |
| `accepts a valid hero image` | `{ slug: 'nekroz', heroImage: '/art/nekroz-hero.webp' }`, key present, `exists` true | does not throw |
| `rejects a missing heroImage` | `{ slug: 'nekroz' }` | throws `content: section nekroz: heroImage is required` |
| `rejects a mismatched path` | `heroImage: '/art/trishula.webp'` | throws containing `must match /art/nekroz-hero.webp` |
| `rejects a missing file` | `exists` returns false | throws containing `heroImage file public/art/nekroz-hero.webp is missing` |
| `rejects missing provenance` | empty key set | throws containing `no entry in content/art-provenance.json` |

Run: `cd website && npx vitest run tests/unit/section-art.test.ts`

## Impl steps

- [ ] 1. Create `website/tests/unit/section-art.test.ts` with the five cases above.
- [ ] 2. Add `assertHeroImage` to `website/scripts/content/identity.mjs` and call it inside the section loop of `loadRegistries()`, passing a `Set` of provenance keys read from `content/art-provenance.json` and an `exists` closure over `website/public`.
- [ ] 3. `mkdir -p website/public/art`.
- [ ] 4. Convert the five illustrations. Run from `website/`, once per row of the source table:
      `node -e "const s=require('sharp');s(process.argv[1]).webp({quality:90,effort:6}).toFile(process.argv[2]).then(i=>console.log(i.width,i.height,i.size))" "../<source>" "public/art/<slug>-hero.webp"`
      Expected stdout per run: `624 624 <bytes>`. Do **not** resize and do **not** call `withMetadata()` — sharp drops source metadata by default, and enlarging a 624 px source only adds blur.
- [ ] 5. Verify each output carries no metadata: `cd website && node -e "const s=require('sharp');s('public/art/<slug>-hero.webp').metadata().then(m=>console.log(m.width,m.exif,m.icc,m.xmp))"` prints `624 undefined undefined undefined`.
- [ ] 6. Create `website/content/art-provenance.json` with one entry per hero image, `generatedOn` set to the date the conversion actually ran, `tool` set to `sharp webp q90 (native 624 px; HD upscale pending)`.
- [ ] 7. Add `"heroImage": "/art/<slug>-hero.webp"` to all five entries in `website/content/sections.json`.
- [ ] 8. Add `heroImage: section.heroImage` to the `sections.push({...})` literal in `website/scripts/content/orchestrator.mjs`.
- [ ] 9. Add `heroImage: string;` to `CatalogSection` in `website/src/lib/catalog.ts`.
- [ ] 10. Confirm `website/.gitignore` and the repo `.gitignore` do not exclude `website/public/art/`; commit the five `.webp` files.
- [ ] 11. Run `npm run content:check`, `npm run build`, `npm run budgets:check`, `npm run format`, `npm run lint`, `npm run check`.

## Outputs

- Files touched: `website/public/art/{non-archetype,burning-abyss,shaddoll,nekroz,spellbook}-hero.webp` (new binaries), `website/content/art-provenance.json` (new), `website/content/sections.json`, `website/scripts/content/identity.mjs`, `website/scripts/content/orchestrator.mjs`, `website/src/lib/catalog.ts`, `website/tests/unit/section-art.test.ts` (new).
- Public API: `catalog.sections[].heroImage`, `assertHeroImage`.
- No migration; catalog schemaVersion unchanged (additive field on an existing object).
- Follow-up left to the owner, not to this ticket: overwrite any `public/art/<slug>-hero.webp` with a higher-resolution upscale and update that entry's `tool`/`generatedOn` in `content/art-provenance.json`. Nothing else changes — no validator asserts dimensions.

## Validation

- [ ] `cd website && npx vitest run tests/unit/section-art.test.ts` — 5 passed
- [ ] `cd website && npm run content:check` — exit 0
- [ ] `cd website && npm run build && npm run budgets:check` — exit 0; each hero webp well under 3 MiB
- [ ] `cd website && npm run build` — the dist scan reports `dist scan: clean` (no embedded source metadata)
- [ ] manual check: open `website/public/art/nekroz-hero.webp` and confirm it is the Trishula illustration at 624×624, unmodified in composition
- [ ] `cd website && npm run ci` — exit 0
- [ ] app functional — no visible page change yet; every route still resolves
- [ ] commit msg draft: `feat(website): commit section hero art derived from the original illustrations`
