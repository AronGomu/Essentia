# T4: Complete sitemap across docs, posts, blog, decks

## Context

Sitemap omits docs/posts plus `/docs/`, `/blog/`, `/decks/`. `catalog.docs` can itself contain `/docs/`, so dedupe required.

## Requirements

- Add exported `STATIC_SITEMAP_ROUTES` and typed `sitemapRoutes(source)` in `src/lib/sitemap.ts`.
- Include static `/`, `/updates/`, `/rules/`, `/philosophy/`, `/legal/`, `/docs/`, `/blog/`, `/decks/`, `/feed.xml`.
- Append sections, cards, card versions, releases, docs, posts.
- Dedupe via insertion-order `Set`.
- Endpoint consumes helper; preserve site/base URL rendering and XML content type.
- No sitemap index, `lastmod`, drafts, aliases, or `404`.

## Inputs

- `website/src/pages/sitemap.xml.ts`
- Catalog type/data shape used by endpoint.

## From Depends

T3 link checker verifies generated sitemap URL paths in root/repo-base builds; helper must preserve endpoint base rendering.

## TDD / Implementation

- [x] T4.1 red: add unit tests covering docs/posts, landing routes, existing dynamic categories, no duplicates — evidence: suite failed because sitemap helper module did not exist.
- [x] T4.2 green: implement route helper and wire endpoint — evidence: focused Vitest 5/5 passed.
- [x] T4.3 refactor: keep XML serialization in endpoint — evidence: root + repo-base builds generated sitemap endpoint successfully.
- [x] T4.4 inspect built sitemap for catalog docs/posts/static landings and repo-base prefix — evidence: 152 unique locs; all 38 docs + 2 posts present; required landings and prefixes valid.

## Outputs

- `website/src/lib/sitemap.ts`
- `website/tests/unit/sitemap.test.ts`
- Updated sitemap endpoint.

## Validation

- [x] `cd website && npx vitest run tests/unit/sitemap.test.ts` — 1 file, 5 tests passed.
- [x] `cd website && npm run build` — 152 pages built; sitemap contains required routes.
- [x] Repo-base build prefixes every `<loc>` with configured base — 152 locs inspected; repo root canonical is `/YGO-x-MTG` without trailing slash, remaining locs start `/YGO-x-MTG/`.
- [x] `cd website && npm run ci` — final run: 77 files/818 tests passed; build/scans passed.
