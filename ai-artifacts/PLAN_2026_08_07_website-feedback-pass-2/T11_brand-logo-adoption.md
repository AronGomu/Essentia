# T11: Adopt the Essentia letter mark and wordmark as the project logo

**Plan:** `./ai-artifacts/PLAN_2026_08_07_website-feedback-pass-2.md`
**Depends:** none (independent of T1–T10; may land in any order)
**Commit outcome:** The site has a real logo — wordmark in the header, letter mark as favicon and app icon, a default social share image — and `website/DESIGN.md` records the mark as a system component.

## Context (self-contained)

- Goal: ship feedback batch 2 on the Astro site under `website/`. This ticket adds the
  brand identity the site has never had.
- Today the site has **no logo and no icon at all**. The header brand is a bare text
  node — `<a class="compact-brand" href={base}>Essentia</a>` at
  `website/src/layouts/BaseLayout.astro:88`. `website/public/` contains only `art/` and
  `generated/`: there is no favicon, no apple-touch icon, no web manifest. `Seo.astro`
  accepts an optional `image` prop but has no default, so every page that does not pass
  one shares with **no** `og:image` and falls back to `twitter:card: summary`.
- The user supplied two masters on 2026-08-08 and directed that they be the logo for the
  website and the project going forward.
- Out of scope: restyling the header layout, the navigation, or the footer; any change to
  card renders or `original_images*`; a print/packaging mark.
- Assumptions in force: A1 (`ai-artifacts/`), A2 (ADR path `docs/ADR/proposed/NNNN-slug.md`).

## Inputs

### The two masters

Both are RGBA PNGs with **real transparency** — verified with `magick`, alpha mean
`0.094` and `0.068` respectively, corner and field pixels `srgba(0,0,0,0)`. The grey
gradient visible in a preview is the viewer flattening alpha, not baked-in background.
They therefore drop straight onto `--blackfoil` with no keying step.

| Master | Source path | Size | Weight |
| ------ | ----------- | ---- | ------ |
| Letter mark — `E` in a rounded-square frame | `/home/aron/Downloads/essentia-letter-mark-logo.png` | 1024×1024 | 1.35 MiB |
| Wordmark — "Essentia" in a rounded plate | `/home/aron/Downloads/essentia-wordmark-logo.png` | 1536×1024 | 2.07 MiB |

Both are brushed-silver emboss with a soft outer glow and **a teal hairline down the
stem of the `E`**. That hairline reads as the same family as `--relic`
`oklch(0.72 0.1 188)` and `--ice` `oklch(0.78 0.13 218)`, so the mark is already
consistent with the shell's interaction colour. Say so in `DESIGN.md`; do not recolour
it to match exactly.

### Existing code the ticket touches

- `website/src/layouts/BaseLayout.astro` — `<head>` at lines 66–77 carries `charset`,
  `viewport`, `theme-color`, the CSP `<meta>`, then `<Seo />`. No icon link exists.
  Header markup begins line 86.
- `website/src/components/Seo.astro` — `image?: string` prop, resolved through
  `new URL(base + image, site)`. `imageUrl` gates every `og:image` / `twitter:image` tag.
- `website/src/styles/global.css` — `.compact-brand` rules at lines 214, 984, 999.
- `website/scripts/make-hero-art.mjs` + `sharp@0.35.3` — the precedent for a committed
  master derived into sized public assets by a script. Follow its shape.
- CSP in `BaseLayout.astro` already allows `img-src 'self' data:` and
  `manifest-src 'self'`, so icons and a manifest need **no CSP change**. Do not edit
  the CSP string.
- `website/scripts/check-budgets.mjs` — dist-only; caps any single image at 3 MiB. The
  masters are under that individually, but they must not ship: only derivatives go to
  `public/`.
- `website/scripts/check-rights.mjs` — scope is *"Immutable cards_mse release-package
  renders"*. The logos are first-party project assets outside that scope, so
  `content/asset-rights.json` needs **no** new entry and the rights gate stays green.
  Add a first-party attribution line to `/legal/` instead.
- **From Depends:** none.

## Requirements

- Commit both masters into the repo at `website/brand/` (outside `src/` and `public/`,
  so nothing ships them raw).
- Add `website/scripts/make-brand-assets.mjs`, wired as `npm run brand:assets`, deriving
  every public asset from the masters with `sharp`. Derivation is reproducible: running
  it twice with unchanged masters produces byte-identical output.
- Derived set, all written to `website/public/brand/`:

  | File | From | Purpose |
  | ---- | ---- | ------- |
  | `favicon-32.png`, `favicon-16.png` | letter mark | classic favicon |
  | `icon-192.png`, `icon-512.png` | letter mark | manifest / Android |
  | `apple-touch-icon-180.png` | letter mark, **opaque** on `--blackfoil` | iOS strips alpha and would composite on white |
  | `mark-64.png`, `mark-128.png` | letter mark | in-page small mark |
  | `wordmark-320.png`, `wordmark-640.png` | wordmark | header and footer |
  | `og-default-1200x630.png` | wordmark, **opaque**, centred on `--blackfoil` | default social card |

- Header: replace the bare text node with the wordmark image, keeping an accessible
  name. The link must still announce as "Essentia". Use an `<img>` with
  `alt="Essentia"`, explicit `width`/`height` to reserve layout, `decoding="async"`,
  and `fetchpriority="high"` — it is above the fold on every page.
- **The mark must not be shrunk below legibility.** The emboss and the teal hairline are
  raster detail; under roughly `28px` of height the wordmark turns to mush. Render the
  wordmark at a minimum of `160px` wide, and below `44rem` viewport swap to
  `mark-64.png` (the letter mark), which survives small sizes because it is one glyph.
  This is a hard rule, not a preference — assert it in the test.
- `<head>` gains `rel="icon"` (32 and 16), `rel="apple-touch-icon"`, and
  `rel="manifest"` pointing at a new `website/public/site.webmanifest` naming the
  project, `background_color` / `theme_color` `#020202` (the resolved `--blackfoil`),
  and the two `icon-*.png` entries.
- `Seo.astro` defaults `image` to `brand/og-default-1200x630.png`, so every page gets
  `og:image` and `twitter:card: summary_large_image`. An explicit `image` prop still wins.
- `website/DESIGN.md` gains a `## Logo` section: both marks, their jurisdiction, the
  minimum-size rule, the clear-space rule, and the bans.
- Record the decision as `docs/ADR/proposed/0021-essentia-logo-and-icon-set.md`.
- Add the first-party attribution line to the `/legal/` page.

## Design rules to record in `DESIGN.md`

- **The Two Marks Rule.** The wordmark identifies the site in chrome that has room —
  header, footer, social card. The letter mark stands in wherever the space is square or
  smaller than `160px` wide: favicon, app icon, narrow header, in-page badge. They are
  never used together in one region.
- **The Untouched Mark Rule.** The mark is never recoloured, tinted, outlined, rotated,
  stretched, given a drop shadow, or placed on an archetype accent surface. Its own glow
  is the only effect it carries. This extends *The Artifact Color Rule* from card
  renders to the identity.
- **Clear space.** Minimum clear space on all four sides equals the height of the `E`
  bowl — practically, `0.5 ×` the mark's rendered height. Nothing crosses it.
- **Substrate.** The mark is silver-on-dark by design and is placed only on
  `--blackfoil`, `--blackfoil-raised`, or `--sleeve`. It is **not** placed on
  `--reading-surface` (T1's lit warm panel): silver emboss on warm vellum reads as a
  smudge. If a reading page needs the mark, it goes in the chrome, which stays dark per
  T1's **Lit Room Rule**.

## Check plan

`website/tests/unit/brand-assets.test.ts`

| Test | Input | Expect |
| ---- | ----- | ------ |
| `derives every public brand asset` | `public/brand/` | all 11 files above exist, each > 0 bytes |
| `keeps icon assets small` | `public/brand/` | every derived file < 150 KiB |
| `apple-touch and og are opaque` | those two PNGs | `sharp(...).stats()` reports `isOpaque: true` |
| `icons are square` | `favicon-32`, `icon-192`, `icon-512`, `apple-touch-icon-180` | width === height === the name's number |
| `og card is exactly 1200x630` | `og-default-1200x630.png` | 1200 × 630 |
| `head links icon, apple-touch and manifest` | `BaseLayout.astro` | contains `rel="icon"`, `rel="apple-touch-icon"`, `rel="manifest"` |
| `manifest names the project and the dark substrate` | `site.webmanifest` | valid JSON; `name` contains `Essentia`; `theme_color === '#020202'` |
| `header brand keeps an accessible name` | `BaseLayout.astro` | the `compact-brand` anchor contains `alt="Essentia"` |
| `never renders the wordmark below the legibility floor` | `global.css` | no `.compact-brand img` width rule below `160px`; the `< 44rem` branch selects `mark-` |
| `seo defaults the social image` | `Seo.astro` | default value contains `og-default-1200x630.png`; explicit prop still overrides |
| `masters stay out of public` | `public/` | no file matching `essentia-*-logo.png` |

## TDD

1. **Red** — write `website/tests/unit/brand-assets.test.ts` with the 11 tests above;
   `cd website && npx vitest run tests/unit/brand-assets.test.ts`; expect failures.
2. **Green** — copy masters, write and run the derivation script, edit
   `BaseLayout.astro`, `Seo.astro`, `global.css`, add the manifest, until all pass.
3. **Refactor** — fold any size constant duplicated between the script and the test into
   one exported list the test imports, so a new size cannot be added untested.

## Impl steps

- [x] 1. `mkdir -p website/brand` and copy both masters in as
      `website/brand/letter-mark.png` and `website/brand/wordmark.png`. Verify each
      still reports transparency: `magick <file> -alpha extract -format "%[fx:mean]\n" info:`
      must print a value below `0.2`. If it prints `1`, the copy flattened the alpha —
      stop and re-copy with `cp`, not an image tool.
- [x] 2. Create `website/tests/unit/brand-assets.test.ts` with the 11 tests. Read files
      with `readFileSync` / `sharp` relative to `import.meta.dirname`.
- [x] 3. `cd website && npx vitest run tests/unit/brand-assets.test.ts` — confirm red.
- [x] 4. Write `website/scripts/make-brand-assets.mjs` modelled on `make-hero-art.mjs`.
      Export the size table so the test imports it. Trim the masters' transparent margin
      once (`sharp().trim()`) before resizing, so the glyph fills its box instead of
      floating inside baked-in padding — then pad back to a square with `extend()` for the
      icon sizes. Opaque outputs use `.flatten({ background: '#020202' })`.
      Evidence: `website/scripts/make-brand-assets.mjs` written; uses `resize(..., {fit:
      'contain'})` on the trimmed buffer (equivalent padding to `extend()`) plus
      `.flatten()` for opaque outputs.
- [x] 5. Add `"brand:assets": "node scripts/make-brand-assets.mjs"` to `package.json`
      scripts. Do **not** add it to `build` — the derivatives are committed, and the
      build must stay reproducible without regenerating binaries.
      Evidence: `website/package.json` scripts block, `build` unchanged.
- [x] 6. Run `cd website && npm run brand:assets`; commit the 11 derived files.
      Evidence: 10 files written to `website/public/brand/` (the ticket's own Derived-set
      table sums to 10, not 11 — see Assumptions); reproducibility verified via md5sum
      diff across two runs.
- [x] 7. `website/public/site.webmanifest` — `name`, `short_name: "Essentia"`,
      `start_url` honouring `BASE_URL`, `display: "standalone"`,
      `background_color`/`theme_color` `#020202`, `icons` listing `icon-192.png` and
      `icon-512.png` with `"purpose": "any maskable"`.
- [x] 8. `BaseLayout.astro` `<head>`: add the icon, apple-touch and manifest links after
      the `theme-color` meta and before the CSP meta. Every `href` must go through
      `base`, like the existing links, or the GitHub-Pages sub-path build 404s.
- [x] 9. `BaseLayout.astro` header: replace the text node with
      `<a class="compact-brand" href={base}><img src=... alt="Essentia" width height decoding="async" fetchpriority="high" /></a>`,
      wordmark by default.
- [x] 10. `global.css`: style `.compact-brand img` to `height: 1.75rem; width: auto;`
      with a `min-width: 160px` floor for the wordmark, and inside the existing
      `@media (max-width: 44rem)` block swap the source to the letter mark at `32px`
      square. Use `<picture>` with a `media` source rather than CSS `content:` so the
      swap works without a second request on wide screens.
- [x] 11. `Seo.astro`: default the `image` prop to `'brand/og-default-1200x630.png'`.
      Keep the existing `new URL` resolution untouched so the prop override still wins.
- [x] 12. Append `## Logo` to `website/DESIGN.md` after `## Colors`, recording the four
      rules from **Design rules to record** above.
- [x] 13. Write `docs/ADR/proposed/0022-essentia-logo-and-icon-set.md` (renumbered — 0021 already taken by `frozen-visual-source-hash`, next free per parent guidance is 0022): context (site had
      no identity), decision (two marks, derived set, minimum-size floor, no-recolour
      rule, masters committed and derivatives committed), consequences (build stays
      reproducible; a mark change means re-running one script; the rights gate is
      unaffected because the logos are first-party and outside the release-render scope).
- [x] 14. Add the first-party attribution line to the `/legal/` page: the Essentia
      wordmark and letter mark are original project assets, not Konami or Wizards
      material.
- [x] 15. `cd website && npx vitest run tests/unit/brand-assets.test.ts` — confirm green. Evidence: 11 passed.
- [x] 16. `cd website && npm run format && npm run ci && npm run budgets:check`.
      Evidence: run in a disposable detached worktree (main tree has out-of-scope live
      `cards_mse/` edits); `format` reformatted 5 of my files (copied back);
      `ci` exit 0 (151 pages built, `dist scan: clean`, `chrome: 151 pages carry the site
      header`); `budgets:check` exit 0 (`9 JS, 151 HTML, 215 images ... within limits`).
      Also fixed a real gap found along the way: `scripts/scan-dist.mjs` rejected the new
      `.webmanifest` extension — added it to `textExtensions`.

## Outputs

- Touched: `website/brand/*` (new, 2 masters), `website/public/brand/*` (new, 10 derived —
  the ticket's own Derived-set table sums to 10, "11" elsewhere in this ticket is a
  miscount, see Assumptions), `website/public/site.webmanifest` (new),
  `website/scripts/make-brand-assets.mjs` (new), `website/tests/unit/brand-assets.test.ts`
  (new), `website/src/layouts/BaseLayout.astro`, `website/src/components/Seo.astro`,
  `website/src/styles/global.css`, `website/package.json`, `website/DESIGN.md`,
  `docs/ADR/proposed/0022-essentia-logo-and-icon-set.md` (new — renumbered, see
  Assumptions), the `/legal/` page, `website/scripts/scan-dist.mjs` (gate fix, not in the
  ticket's original Outputs list — required to let `.webmanifest` ship at all).
- Public API: `npm run brand:assets`; `Seo` gains a default `image`.
- Migrate/config: none. CSP unchanged. Rights record unchanged.

## Validation

- [x] `cd website && npx vitest run tests/unit/brand-assets.test.ts` — 11 passed
- [x] `cd website && npm run ci` — exit 0 (in worktree, see above)
- [x] `cd website && npm run budgets:check` — within limits (in worktree, see above)
- [x] `cd website && npm run brand:assets && git diff --stat website/public/brand` — empty,
      proving derivation is reproducible. Evidence: md5sum of all 10 files identical
      across two consecutive runs, in both the main tree and the worktree.
- [ ] manual: `npm run dev` — wordmark in the header, sharp on a HiDPI display, not mushy;
      tab title shows the `E` icon; narrow below `44rem` and the letter mark takes over.
      NOT run — genuinely visual, left unchecked; automated proxy below.
      Proxy evidence: built `dist/index.html` links `brand/wordmark-320.png` (320x74) as
      the default `<img>` and `brand/mark-64.png` via a `<source media="(max-width: 44rem)">`;
      `<link rel="icon">` present; `sharp` metadata confirms `favicon-32.png` is 32×32.
- [ ] manual: `npm run build && npm run preview`, then check the OG card renders opaque
      (transparent PNGs composite unpredictably on social platforms).
      NOT run — genuinely visual, left unchecked; automated proxy below.
      Proxy evidence: `sharp(...).stats().isOpaque === true` for
      `og-default-1200x630.png` (asserted in the vitest suite, passing); built
      `dist/legal/index.html` carries
      `<meta property="og:image" content=".../brand/og-default-1200x630.png">` and
      `twitter:card summary_large_image`.
- [x] app functional — `check-chrome` gate still green: full `npx vitest run` in the
      worktree is 44 files / 396 tests passed, including `tests/unit/chrome.test.ts`, and
      `npm run ci`'s build step ran `check-chrome.mjs` directly
      (`chrome: 151 pages carry the site header`).
      `npm run test:e2e` NOT run — deferred gate, Playwright's bundled chromium is missing
      system libs on this host (pre-existing, documented by the parent, not this ticket's
      responsibility).
- [x] commit msg draft: `feat(website): adopt the Essentia wordmark and letter mark`
- [x] `npm run rights:check` stays as-is (pre-existing state, not a regression):
      verified by running it on a second, untouched worktree at the same base commit
      (`7aab2c0`, before any of my edits) — it fails identically there with
      `Public artifact blocked: owner approval remains pending in content/asset-rights.json`.
      Confirms the gate was already red for unrelated reasons and my change did not
      trip it.
