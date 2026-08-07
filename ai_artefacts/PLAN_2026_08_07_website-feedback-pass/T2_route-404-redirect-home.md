# T2: Unknown route redirects home

**Plan:** `./ai_artefacts/PLAN_2026_08_07_website-feedback-pass.md`
**Depends:** T1
**Commit outcome:** any URL that is not a published page sends the visitor to the site root instead of showing a "Card not found" page.

## Context (self-contained)

- Goal: ship the UX feedback backlog in `.dev/feedback.md` on the Astro site in `website/`.
- This slice: feedback **Home #4** — "Make wrong url redirect to home page `/`". The site is a static GitHub Pages build; the host serves `dist/404.html` for unknown paths, so the redirect lives in that document.
- Out of scope here: `src/pages/[...alias].astro` (per-card moved-route redirects) stays exactly as it is. Do not delete it.
- Assumptions in force: redirect via `<meta http-equiv="refresh">` so it works without JS; the page stays `noindex`.

## Requirements

- `dist/404.html` redirects to the site base (`import.meta.env.BASE_URL`, `/` by default) with zero delay.
- The old "Card not found" heading and body copy are gone.
- A build-time gate fails the build if the 404 document ever loses its redirect.

## Inputs

- `website/src/pages/404.astro` — currently wraps `BaseLayout` and renders `<h1>Card not found</h1>`. Replace its whole content.
- `website/src/pages/[...alias].astro` — the shape to copy for a bare redirect document (`<meta http-equiv="refresh" content={...}>`, `<link rel="canonical">`, `<meta name="robots" content="noindex">`, a body paragraph with a manual link).
- `website/package.json` — `"build": "node scripts/build-content.mjs && astro build && node scripts/harden-csp.mjs && node scripts/scan-dist.mjs"`. Append the new gate at the end.
- `website/scripts/scan-dist.mjs` — style reference for a dist-reading gate.
- **From Depends (T1):** `website/scripts/check-preflight.mjs` exists and `npm run preflight` passes. Nothing else consumed.

## TDD

1. **Red** — write `website/tests/unit/route-404.test.ts` importing `assert404` from `../../scripts/check-404.mjs`. Fails: module missing.
2. **Green** — implement `check-404.mjs`, then rewrite `404.astro` until `npm run build` passes the gate.
3. **Refactor** — none.

Exact signature:

```js
/**
 * @param {string} html contents of dist/404.html
 * @param {string} base site base path, e.g. '/' or '/YGO-x-MTG/'
 * @returns {string[]} problems, empty when the document is a valid home redirect
 */
export function assert404(html, base)
```

Rules `assert404` enforces:

- returns `404.html is missing a zero-delay meta refresh to <base>` unless the html contains `content="0; url=<base>"` (case-insensitive on the attribute name, exact on the value)
- returns `404.html must stay noindex` unless it contains `name="robots"` with `noindex`
- returns `404.html still renders the old not-found page` if it contains `Card not found`

CLI tail: read `path.resolve(process.env.OUT_DIR ?? 'dist', '404.html')`, call `assert404(html, process.env.BASE_PATH ?? '/')`, `throw new Error` when non-empty, else `process.stdout.write('404: redirects to site root\n')`.

## Test plan

| Test | Input | Expect |
| ---- | ----- | ------ |
| `accepts a root redirect document` | html with `content="0; url=/"`, `name="robots" content="noindex"` and base `/` | `[]` |
| `accepts a subpath deployment` | html with `content="0; url=/YGO-x-MTG/"`, base `/YGO-x-MTG/` | `[]` |
| `rejects a missing refresh` | html without the meta refresh, base `/` | contains `404.html is missing a zero-delay meta refresh to /` |
| `rejects the legacy not-found page` | html containing `<h1>Card not found</h1>` and a valid refresh | contains `404.html still renders the old not-found page` |
| `rejects an indexable 404` | valid refresh, no robots meta | contains `404.html must stay noindex` |

Run: `cd website && npx vitest run tests/unit/route-404.test.ts`

## Impl steps

- [ ] 1. Create `website/tests/unit/route-404.test.ts` with the five cases above.
- [ ] 2. Create `website/scripts/check-404.mjs` exporting `assert404` plus the CLI tail.
- [ ] 3. Replace the entire body of `website/src/pages/404.astro` with a standalone document (no `BaseLayout`):
      frontmatter `const base = import.meta.env.BASE_URL;`, then `<!doctype html><html lang="en"><head>` containing
      `<meta charset="UTF-8" />`, `<meta name="robots" content="noindex" />`,
      `<meta http-equiv="refresh" content={`0; url=${base}`} />`,
      `<link rel="canonical" href={new URL(base, Astro.site)} />`, `<title>Redirecting — Essentia</title>`,
      and a `<body>` with `<p>This route is not part of the archive. <a href={base}>Continue to the Essentia home page</a>.</p>`.
- [ ] 4. Append ` && node scripts/check-404.mjs` to the `build` script in `website/package.json`.
- [ ] 5. Run `npm run format` and `npm run lint`.

## Outputs

- Files touched: `website/src/pages/404.astro`, `website/scripts/check-404.mjs` (new), `website/tests/unit/route-404.test.ts` (new), `website/package.json`.
- Behaviour change: unknown routes redirect to `/`; the not-found page is gone.
- No migration.

## Validation

- [ ] `cd website && npx vitest run tests/unit/route-404.test.ts` — 5 passed
- [ ] `cd website && npm run build` — ends with `404: redirects to site root`
- [ ] `cd website && npm run links:check` — exit 0
- [ ] manual check: `npx http-server dist -p 4321` (or `node scripts/serve-dist.mjs`), open `http://localhost:4321/does-not-exist/`, land on `/`
- [ ] `cd website && npm run ci` — exit 0
- [ ] app functional — every real route still resolves
- [ ] commit msg draft: `feat(website): redirect unknown routes to the home page`
