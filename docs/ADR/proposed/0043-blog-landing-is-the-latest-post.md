# ADR 0043 — The blog landing is the latest post; the rail is the index

- Date: 2026-08-13
- Status: Proposed
- Scope: `website/src/pages/blog/index.astro`, `website/src/lib/reading-nav.ts`, `website/src/lib/catalog.ts`, `website/src/components/Navigation.svelte`, `website/content/reading-order.json`
- Review: `ai-artifacts/GRILL_2026_08_12_feedback_batch_3/round-1.html` Q10, `round-2.html` Q6; revises the blog half of ADR 0025 and ADR 0026

## Context

`/blog/` renders a list of every post — title, date, author, summary — while the left rail
already lists every post beside it. Two indexes, one screen, two posts.

In the rail each post renders as `{title}<small>{formatDate(date)}</small>` on one line, so
"Legend of the Alpha v0.1 — set presentation" shares its line with "8 August 2026" and both
lose.

The blog groups in `reading-order.json` exist to support named series. There is one group,
`All posts`, labelling every post that exists.

## Decision

1. `/blog/` renders the **latest post inline** — the same title, meta line and body as
   `/blog/{slug}/`. No list page remains.
2. `/blog/{slug}/` stays canonical. The landing page declares
   `<link rel="canonical">` pointing at the latest post's own route, so the duplicate is
   never indexed twice. `BaseLayout.astro` gains a `canonicalPath` prop to forward it to
   `Seo.astro`, which already accepts one.
3. No redirect. A static-host redirect from `/blog/` costs a visible flash and a broken back
   button; rendering the content directly costs neither.
4. The rail is the blog index: one flat list, newest first, no group heading. The blog half of
   `reading-order.json` is deleted along with `postGroups` in the catalog.
5. Rail items give the title the full rail width, with the date beneath it as `DD/MM/YYYY`.
6. `DD/MM/YYYY` is scoped to the rail. `formatDate` — `Intl.DateTimeFormat('en', { dateStyle:
   'long' })` — is unchanged on the post page, card pages and the updates feed.

## Consequences

- With no posts, `/blog/` renders "No posts published yet." and does not crash.
- Publishing a post changes what `/blog/` serves. That is the point.
- A visitor who wants an older post uses the rail, which is present at every width — on a
  phone through the drawer.
- Grouping posts into named series later means reintroducing a group concept in the rail; the
  flat shape is a deliberate trade against configuration nobody is using today.
- `formatDateNumeric` joins `formatDate` in `src/lib/catalog.ts`; both are strict about the
  `YYYY-MM-DD` shape and throw on anything else.
