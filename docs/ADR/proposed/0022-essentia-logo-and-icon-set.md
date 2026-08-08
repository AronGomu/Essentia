# 0022: Essentia logo and icon set

**Status:** Proposed
**Date:** 2026-08-08

## Context

The website has never had a real identity: the header brand was a bare text
node (`<a class="compact-brand">Essentia</a>`), and `website/public/` had no
favicon, no apple-touch icon, and no web manifest. `Seo.astro` accepted an
optional `image` prop with no default, so every page that did not pass one
shipped with no `og:image` and fell back to `twitter:card: summary`.

The user supplied two brand masters on 2026-08-08 — a letter mark (an `E` in
a rounded-square frame) and a wordmark ("Essentia" in a rounded plate), both
RGBA PNGs with real transparency — and directed that they become the logo for
the website and the project going forward.

## Decision

- Commit both masters at `website/brand/` (outside `src/` and `public/`, so
  they never ship raw).
- Derive ten public assets from the masters with a new, reproducible script,
  `website/scripts/make-brand-assets.mjs` (`npm run brand:assets`), modelled
  on the `make-hero-art.mjs` precedent: classic favicons, manifest/Android
  icons, an opaque apple-touch icon, small in-page marks, two wordmark
  widths, and an opaque default OG card. The derivatives are committed like
  the hero art is; the script is deliberately **not** part of `npm run
  build`.
- Adopt **The Two Marks Rule**: the wordmark identifies the site wherever
  there is room (header, footer, social card); the letter mark stands in
  wherever the space is square or smaller than `160px` wide. They are never
  used together in one region.
- Adopt **The Untouched Mark Rule**: the mark is never recoloured, tinted,
  outlined, rotated, stretched, or given a drop shadow, extending *The
  Artifact Color Rule* from card renders to the identity.
- Enforce a **minimum-size floor**: the wordmark never renders narrower than
  `160px`; below a `44rem` viewport the header swaps to the letter mark,
  which survives small sizes because it is one glyph. This floor is asserted
  by `website/tests/unit/brand-assets.test.ts`, not left as a style
  preference.
- Default `Seo.astro`'s `image` prop to `brand/og-default-1200x630.png`, so
  every page gets an `og:image` and `twitter:card: summary_large_image`
  unless it explicitly overrides the prop.
- Add `<link rel="icon">` (32 and 16), `<link rel="apple-touch-icon">`, and
  `<link rel="manifest">` to `BaseLayout.astro`, plus a new
  `website/public/site.webmanifest` naming the project and using the
  resolved `--blackfoil` (`#020202`) as `background_color`/`theme_color`.
- Record a first-party attribution line on `/legal/`: the marks are original
  project assets, not Konami or Wizards of the Coast material.

## Consequences

- The build stays reproducible without regenerating binaries: derivative PNGs
  are committed, and `brand:assets` only needs to re-run when a master
  changes.
- A future mark change means re-running one script and re-committing ten
  files, not hand-editing per-size exports.
- `website/scripts/check-rights.mjs`'s scope is immutable `cards_mse`
  release-package renders; the logos are first-party project assets outside
  that scope, so `content/asset-rights.json` needs no new entry and the
  rights gate is unaffected.
- The CSP already allows `img-src 'self' data:` and `manifest-src 'self'`, so
  no CSP change was needed.
