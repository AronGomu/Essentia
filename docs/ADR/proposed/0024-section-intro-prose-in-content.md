# ADR 0024 — Section intro prose is authored, not scraped

- Date: 2026-08-08
- Status: Proposed — accepted for implementation by `ai-artifacts/PLAN_2026_08_08_website-feedback-pass-2.md` (T5)
- Scope: website content build, section hero pages, SEO description

## Context

`catalog.sections[].intro` came from `introFromDoc()` in
`website/scripts/content/orchestrator.mjs`: read the section's design doc, strip
markdown, take the first paragraph longer than 40 characters, slice to 360.

That produced "Nekroz is blue Ritual / Toolbox / Anti-Extra Deck." — a designer's
shorthand, not a reader's introduction. The requested replacements are prose written
for a visitor, and the Nekroz one is three paragraphs with a bullet list. A scraper
that takes one paragraph cannot carry it, and widening the scrape would make every
archetype page hostage to the first paragraph of a design document that exists for a
different audience.

The obvious alternative — a new markdown file under `docs/` — is blocked: the docs
corpus loader publishes every `.md` under `docs/` as a doc page or fails the build, so
five intro files would become five doc pages nobody asked for.

## Decision

1. Section intro prose is authored markdown at
   `website/content/section-intros/{slug}.md`, one file per entry in
   `website/content/sections.json`. A missing file, an extra file, or a file for an
   unknown slug fails the build.
2. The loader mirrors `loadExplanations()`: no symlinks, `.md` only, 256 KiB cap, no
   raw HTML, no image syntax, and every link target must be absolute, `mailto:`, an
   anchor, or site-root-relative.
3. `catalog.sections[].introMarkdown` carries the file body verbatim and is rendered
   through the existing `Markdown.astro` on the archetype and non-archetype hero.
4. `catalog.sections[].intro` survives as the plain-text summary — first paragraph,
   markdown stripped, truncated at a word boundary to 360 characters. It keeps feeding
   `<meta name="description">` and the page `description` prop.
5. `introFromDoc()` is deleted. `section.doc` stays in `sections.json` and is still
   validated, because it names the design doc of record for that section.

## Consequences

- Editing an archetype's public description no longer edits its design doc, and vice
  versa. The two audiences are separated.
- One more required file per section. Adding a section now means adding its intro or
  failing the build — deliberate, since a section with no description is a bug.
- Rich intros are possible (lists, links, emphasis) but bounded by the same safe-markdown
  rules the card design notes already follow.
- Intro prose lives in `website/content/`, not `docs/`. That is a deviation from
  "docs are the source of truth" and is accepted here specifically because the docs
  corpus is a publication surface, not a data directory.
- SEO descriptions now derive from copy written for readers, which should improve them,
  but they are no longer guaranteed to match the design doc's framing.
