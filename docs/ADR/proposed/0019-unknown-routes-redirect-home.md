# ADR 0019 — Unknown routes redirect home; there is no welcome page

- Date: 2026-08-07
- Status: Proposed — accepted for implementation by `ai_artefacts/PLAN_2026_08_07_website-feedback-pass.md` (T2, T12)
- Scope: website routing, entry points, spec supersession

## Context

Two feedback items concern where a visitor lands.

**Wrong URLs.** `src/pages/404.astro` renders a "Card not found" page. On GitHub Pages that document is served for every unmatched path, including a mistyped card slug, an old bookmark, and a crawler probing. Feedback asks that a wrong URL go to `/`.

**Welcome page.** `WEBSITE_V2_SPEC.md` §2.3 planned a presentation landing at `/`, a returning-visitor home at `/releases/`, and an inline `<head>` script on `/` that reads `localStorage['essentia.v1.visited']` and calls `location.replace()` for known visitors. None of it is built. Feedback rejects the concept: "If exist, remove welcome page or first time page. Home page `/` replaces it."

## Decision

1. `dist/404.html` becomes a bare redirect document: `<meta http-equiv="refresh" content="0; url=<base>">`, `noindex`, a canonical link to the base, and a manual link in the body for the no-refresh case. It uses no layout.
2. A build gate (`scripts/check-404.mjs`) fails the build if that document loses its redirect, becomes indexable, or regains the not-found copy.
3. `/` is the single entry point for every visitor, first-time or returning. There is no welcome route, no first-visit redirect, and no `essentia.v1.visited` key.
4. The project presentation lives at `/docs/`, the first page of the documentation, reachable from the home hero CTA and from the header on every page.
5. `WEBSITE_V2_SPEC.md` §2.3 is deleted and replaced with a note recording items 3 and 4.

## Consequences

- A mistyped card URL costs one redirect instead of a dead end. Search engines see `noindex` on the 404 document and a canonical pointing home.
- The site keeps zero client-side routing logic. Nothing reads `localStorage` to decide where a visitor lands.
- A visitor who wants the presentation always finds it in the same place — the header's first button — instead of behind a query parameter.
- `/releases/` remains unbuilt and unplanned by this decision; the release timeline stays a spec item.
