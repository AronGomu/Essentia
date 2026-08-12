# T8: Archetype page backgrounds

**Plan:** `./ai-artifacts/PLAN_2026_08_12_feedback_batch_2.md`
**Depends:** T7
**Commit outcome:** `/archetypes/burning-abyss/` and `/archetypes/nekroz/` carry their own dimmed photographic backdrop under the existing gradient atmosphere; every other page is untouched.

## Context (self-contained)

- Goal: feedback batch 2 — cut dev/CI loop cost and fix website card surfaces. This ticket = archetype backgrounds (item 9).
- Owner supplied two AI-generated images and chose: copy into `website/public/backgrounds/`, layer as a fixed dimmed image **under** the existing `--page-atmosphere` gradient, **archetype pages only**, dim enough not to overpower the page.
- Sources on disk right now: `/home/aron/Downloads/burning-abyss-bg.png` (2.3 MB) and `/home/aron/Downloads/nekroz-bg.png` (3.1 MB). They are converted once to webp (like hero art, ADR 0018 style) so a 3 MB PNG is not shipped per page view.
- Out of scope here: backgrounds for other archetypes, card-page backgrounds, changing existing `--page-atmosphere` gradients, hero art, markdown images (T9).
- Assumptions in force: the theme attribute alone is not enough (`data-theme="nekroz"` is also set on Nekroz **card** pages), so a separate page marker is required. CSP forbids `style=""` attributes, so the per-page url is injected through a `<style>` block, which `harden-csp.mjs` hashes. `check-rights.mjs` covers card renders only (`release:*` keys), so these page assets need a provenance entry, not a rights entry.
- **From T7:** card page markup is `<article class="card-page">` → `.page-shell.card-detail` → `.related-band` → `.related-band-inner`; `global.css` gained `.related-band`, `.related-band-inner`, and a 90rem 6-column rule. Nothing from T7 is edited here.

## Requirements

- `website/public/backgrounds/burning-abyss.webp` and `website/public/backgrounds/nekroz.webp`, max width 2560 px, sharp webp quality 80, each under 600 KB.
- A committed, manually-run converter `website/scripts/make-archetype-backgrounds.mjs` plus npm script `backgrounds:art`, mirroring `scripts/make-hero-art.mjs`: never part of `npm run build`, no network, takes source paths from a constant map so a re-run is reproducible.
- `BaseLayout.astro` gains optional props `page?: string` (rendered as `data-page` on `<html>`) and `background?: string` (public-relative path). When `background` is set, the layout emits one hashed `<style>` block setting `--page-photo`.
- `body::before` gains two background layers below the atmosphere: a flat dim veil, then the photo, `cover` / centred / `no-repeat`. No photo → `none`, i.e. exactly today's paint.
- Dim: veil `linear-gradient(oklch(0.08 0 0 / 0.72), oklch(0.08 0 0 / 0.72))`; the whole `body::before` layer already renders at `opacity: 0.82`.
- `content/art-provenance.json` records both files; its `note` is corrected — it currently claims "No generative service is used", which stops being true for these two page backdrops.
- Only archetype pages set `page="archetype"` + `background`.

## Inputs

- `website/src/layouts/BaseLayout.astro` — `interface Props { title; description; image?; accent?; theme?; breadcrumb? }`; destructuring `const { title, description, image, accent = 'relic', theme = 'archive', breadcrumb } = Astro.props;`; root element `<html lang="en" data-accent={accent} data-theme={theme} data-catalog="expanded">`; `const base = import.meta.env.BASE_URL;` is already in scope; CSP meta tag is authored with `'unsafe-inline'` and hardened at build time.
- `website/src/pages/archetypes/[slug].astro` — passes `title`, `description`, `image={section.image}`, `accent={section.accent}`, `theme={section.slug}`, `breadcrumb`; `section.slug` is `burning-abyss`, `nekroz`, `shaddoll`, `spellbook`.
- `website/src/styles/global.css` — `@layer base`:

  ```css
  body::before,
  body::after { content: ''; position: fixed; inset: 0; z-index: -1; pointer-events: none; }
  body::before {
    opacity: 0.82;
    background: var(--page-atmosphere, radial-gradient(circle at 80% -10%, color-mix(in oklch, var(--accent) 18%, transparent), transparent 36rem));
  }
  body::after { opacity: 0; background: var(--page-pattern, none); }
  ```

  Theme atmospheres are flat rules from line 1177 (`html[data-theme='home']` … `html[data-theme='spellbook']`).
- `website/scripts/make-hero-art.mjs` — the pattern to mirror: exported pure helpers, `sharp`, writes into `public/art/`, updates `content/art-provenance.json`, documented as deliberately outside `npm run build`. Wired as `"hero:art": "node scripts/make-hero-art.mjs"`.
- `website/content/art-provenance.json` — `{ "schemaVersion": 1, "note": "Hero art is converted from the original Konami illustration with sharp. No generative service is used. …", "art": [ { "key": "/art/<slug>-hero.webp", "source": "…", "tool": "sharp webp q90 …", "generatedOn": "YYYY-MM-DD" } ] }`.
- `website/scripts/content/identity.mjs` — `assertHeroImage(section, provenanceKeys, exists)` requires a provenance key per hero image; it ignores unrelated keys, so new `/backgrounds/*` keys are safe.
- `website/scripts/check-budgets.mjs` — fails any single non-print image over 3 MiB and images total over 180 MiB.
- `website/package.json` scripts block — `hero:art`, `brand:assets` are the sibling manual scripts.
- **From T7:** see Context.

## TDD

1. **Red** — add `tests/unit/archetype-background.test.ts` with the 5 unit cases and `tests/e2e/archetype-background.spec.ts` with the 2 e2e cases. All fail.
2. **Green** — impl steps 2-8.
3. **Refactor** — none.

## Test plan

| Test                                                     | Input                                                                                 | Expect                                                                        |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| unit `background files exist and are small`              | `public/backgrounds/{burning-abyss,nekroz}.webp`                                       | both exist, each `size < 600 * 1024`                                          |
| unit `every background has provenance`                   | `content/art-provenance.json` keys vs `public/backgrounds/*.webp`                       | every file has a matching `/backgrounds/<name>.webp` key                       |
| unit `provenance note admits AI generation`              | `art-provenance.json.note`                                                            | mentions AI generation and no longer claims no generative service was used     |
| unit `photo layer is authored below the atmosphere`      | `global.css` `body::before` declaration text                                           | `background` value order is `var(--page-atmosphere…)`, then the dim veil, then `var(--page-photo, none)` |
| unit `only archetype pages request a background`         | grep `src/pages/**/*.astro`                                                            | exactly one file passes `background=` and it is `src/pages/archetypes/[slug].astro` |
| e2e `archetype page paints the photo`                    | `/archetypes/nekroz/`                                                                 | `getComputedStyle(document.body, '::before').backgroundImage` contains `backgrounds/nekroz`; `<html data-page="archetype">` |
| e2e `card page of the same theme has no photo`           | `/cards/nekroz-trishula/`                                                             | same computed value does **not** contain `backgrounds/`                        |

## Impl steps

- [ ] 1. Write both test files.
- [ ] 2. Create `website/scripts/make-archetype-backgrounds.mjs`, mirroring `make-hero-art.mjs`:

  ```js
  import { readFile, writeFile, mkdir } from 'node:fs/promises';
  import path from 'node:path';
  import sharp from 'sharp';

  /** Owner-supplied AI-generated backdrops. Converted once, by hand, then committed. */
  export const BACKGROUND_SOURCES = {
    'burning-abyss': '/home/aron/Downloads/burning-abyss-bg.png',
    nekroz: '/home/aron/Downloads/nekroz-bg.png',
  };
  export const MAX_WIDTH = 2560;
  export const WEBP_QUALITY = 80;
  export const PROVENANCE_TOOL = `AI-generated by the owner; sharp webp q${WEBP_QUALITY} (max ${MAX_WIDTH} px)`;
  ```

  The default export/main body: for each slug, `sharp(source).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true }).webp({ quality: WEBP_QUALITY, effort: 5 }).toFile('public/backgrounds/<slug>.webp')`, then upsert the provenance entry `{ key: '/backgrounds/<slug>.webp', source: <absolute source path>, tool: PROVENANCE_TOOL, generatedOn: '<today>' }` and rewrite `content/art-provenance.json` with 2-space JSON + trailing newline. Accept `--source-dir <dir>` to override the parent directory of the sources so the script still runs when `~/Downloads` is cleaned.

- [ ] 3. Add `"backgrounds:art": "node scripts/make-archetype-backgrounds.mjs"` to `website/package.json` scripts, next to `hero:art`.
- [ ] 4. Run `cd website && npm run backgrounds:art`; confirm both webp files exist and are under 600 KB (`ls -la public/backgrounds/`). Commit the two webp files (they are in `public/`, which is tracked — only `public/generated/` is ignored).
- [ ] 5. Edit `website/content/art-provenance.json`: keep `schemaVersion: 1`, replace `note` with text that states hero art is converted from Konami illustrations with sharp **and** that the two `/backgrounds/*.webp` page backdrops are AI-generated by the owner, and keep the two entries written by the script (sorted after the `/art/` entries is fine).
- [ ] 6. In `website/src/layouts/BaseLayout.astro`: add `page?: string;` and `background?: string;` to `Props`, destructure `page`, `background`, render `data-page={page}` on the `<html>` element, and inside `<head>` after the CSP meta add

  ```astro
  {
    background && (
      <style
        set:html={`html[data-page='archetype'] body { --page-photo: url('${withBase(base, background)}'); }`}
      />
    )
  }
  ```

  Import `withBase` from `../lib/catalog` (the layout already imports `catalog` and `previewDefinitions` from there).

- [ ] 7. In `website/src/pages/archetypes/[slug].astro`, pass to `BaseLayout`: `page="archetype"` and `background={`backgrounds/${section.slug}.webp`}` — but only when the file exists for that slug. Use a const in the frontmatter:

  ```ts
  const BACKGROUND_SLUGS = new Set(['burning-abyss', 'nekroz']);
  const background = BACKGROUND_SLUGS.has(section.slug)
    ? `backgrounds/${section.slug}.webp`
    : undefined;
  ```

- [ ] 8. In `website/src/styles/global.css` `@layer base`, replace the `body::before` rule with:

  ```css
  body::before {
    opacity: 0.82;
    background:
      var(
        --page-atmosphere,
        radial-gradient(
          circle at 80% -10%,
          color-mix(in oklch, var(--accent) 18%, transparent),
          transparent 36rem
        )
      ),
      /* Dim veil: the photo must sit behind the page, not compete with it. */
      linear-gradient(oklch(0.08 0 0 / 0.72), oklch(0.08 0 0 / 0.72)),
      var(--page-photo, none);
    background-position: 50% 0, 50% 50%, 50% 50%;
    background-repeat: no-repeat, no-repeat, no-repeat;
    background-size: auto, auto, cover;
  }
  ```

## Outputs

- Files touched: `website/scripts/make-archetype-backgrounds.mjs` (new), `website/package.json`, `website/public/backgrounds/burning-abyss.webp` + `nekroz.webp` (new binaries), `website/content/art-provenance.json`, `website/src/layouts/BaseLayout.astro`, `website/src/pages/archetypes/[slug].astro`, `website/src/styles/global.css`, `website/tests/unit/archetype-background.test.ts` (new), `website/tests/e2e/archetype-background.spec.ts` (new).
- Public API change: `BaseLayout` gains `page` and `background` props; `<html>` may carry `data-page`.
- Migrations/config: new npm script `backgrounds:art`; sources live outside the repo, so the constant map documents where they came from.

## Validation

- [ ] `cd website && npx vitest run` — no new failures
- [ ] `cd website && npm run check && npm run lint && npm run format:check`
- [ ] `cd website && npm run build` — `harden-csp` must succeed, proving the injected `<style>` is hashed and no `unsafe-inline` survives
- [ ] `cd website && npm run budgets:check`
- [ ] `cd website && npx playwright test tests/e2e/archetype-background.spec.ts tests/e2e/archetype-hero-panel.spec.ts`
- [ ] manual check: `/archetypes/nekroz/` and `/archetypes/burning-abyss/` show a dim backdrop; text contrast still comfortable; `/archetypes/shaddoll/` unchanged
- [ ] commit msg draft: `feat(website): dim photo backdrops for the Burning Abyss and Nekroz pages`
