# ADR 0026 — Docs and blog ordering is configuration, not code

- Date: 2026-08-08
- Status: Proposed — accepted for implementation by `ai-artifacts/PLAN_2026_08_08_website-feedback-pass-2.md` (T9)
- Scope: website content build, docs corpus, blog corpus, reading navigation
- Related: [0025 — The catalog rail owns reading navigation](0025-catalog-rail-owns-reading-navigation.md)

## Context

The sections and order of the documentation list lived in `DOC_GROUPS`, a hardcoded
array at the top of `website/scripts/content/docs.mjs`. Moving `GLOSSARY.md` above
`CONTEXT.md`, renaming a group, or introducing a "Getting started" section meant
editing build code — and every doc not listed there fails the build, so the array is
also the corpus's completeness check.

The blog had no grouping at all: `blogRailItems()` returned every post newest-first.
There was no way to pin an announcement or to separate release notes from design notes.

## Decision

1. `website/content/reading-order.json` (`schemaVersion: 1`) holds both lists:
   - `docs`: ordered groups of `{ key, label, files }`, where `files` is an ordered
     array of repo-relative `docs/**.md` paths, or `null` for the single catch-all
     group (today: archetype docs, in path order);
   - `blog`: ordered groups of `{ key, label, slugs }`, where `slugs` is an ordered
     array of post slugs, or `null` for the single catch-all group (remaining posts,
     newest first, then slug ascending).
2. Exactly one docs group may use `files: null` and exactly one blog group may use
   `slugs: null`. Zero or two is a build failure — a corpus with no catch-all silently
   drops content, and two catch-alls has no defined winner.
3. A doc path listed in two groups, a blog slug that names no post, a non-kebab key, a
   duplicate key, or an empty label all fail the build.
4. `loadDocs(groups)` takes the groups as an argument; `DOC_GROUPS` is deleted. The
   "not listed" failure message becomes `is not listed in the reading order`.
5. `catalog.postGroups` is added, empty groups dropped, and is what the reading nav
   renders.

## Consequences

- Reordering or re-sectioning the docs is a JSON edit plus `npm run content`. No code
  review of build logic for an editorial change.
- The blog gains sections it never had. A post left out of every explicit group still
  appears, via the catch-all — content cannot be lost by forgetting to list it.
- The config duplicates paths that already exist on disk. A renamed doc must be renamed
  in two places, and the build says so immediately.
- `reading-order.json` joins `sections.json`, `identities.json` and
  `section-intros/` as an authored input to the content build; the pipeline's inputs are
  now uniformly data files rather than a mix of data and code constants.
