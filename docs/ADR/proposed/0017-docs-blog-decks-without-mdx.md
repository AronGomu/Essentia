# ADR 0017 — Docs, blog, and local decks ship without MDX or new runtime dependencies

- Date: 2026-08-07
- Status: Proposed — accepted for implementation by `ai-artifacts/PLAN_2026_08_07_website-feedback-pass.md` (T3–T8)
- Scope: website dependencies, content pipeline, CSP, zero-JS baseline

## Context

Website feedback replaces the header's Rules and Philosophy links with three buttons: Learn about Essentia (`/docs/`), Blog (`/blog/`), Decks (`/decks/`). None of the three route trees exists.

`WEBSITE_V2_SPEC.md` §2.1 planned `@astrojs/mdx` for the blog so posts could embed `<Card id>`, `<Decklist id mode>`, and `<PrintButton>` components. The repo's constraints push the other way:

- CSP is `default-src 'none'` with per-file hashed inline script and style; `scripts/harden-csp.mjs` is the only place it changes.
- `npm run audit:deps` and `scripts/check-licenses.mjs` gate every dependency.
- The corpus is one migrated post and 37 repo Markdown files, none of which need components.
- `website/src/lib/markdown.ts` already exists, is hand-written, escapes before rendering, and rejects unsafe URLs.

## Decision

1. No new runtime or build dependency. `renderSafeMarkdown` is extended in place to cover what the corpus uses: `#`–`####` headings with slugged ids, ordered lists, one level of nested bullets, fenced code, blockquotes, GFM pipe tables, horizontal rules.
2. `/docs/` publishes `docs/**/*.md` except `docs/ADR/**`, with relative `.md` links rewritten to site routes and a dead link failing the build.
3. `/blog/` publishes `website/content/blog/<yyyy-mm-dd-slug>/index.md` — plain Markdown with a validated front-matter block, no MDX, no prose components, raw HTML rejected.
4. `/decks/` is the browser-local decklist manager from spec §5.4, backed by `essentia.v1.decks`. It is the one documented exception to the zero-JS baseline; without JS it renders a static explanation.
5. Export and import on `/decks/` use a copyable textarea, not a `blob:` or `data:` download, so the CSP is untouched.

## Consequences

- Blog posts cannot embed live card components. When that becomes necessary, MDX is revisited as its own decision with its own dependency review.
- The hand-written renderer is now load-bearing for 38 documents. It carries a unit test per construct.
- Docs and blog stay readable with JavaScript disabled; only `/decks/` needs it.
- Spec §2.1 is superseded; §1.1 and §5.4 land in reduced form.
