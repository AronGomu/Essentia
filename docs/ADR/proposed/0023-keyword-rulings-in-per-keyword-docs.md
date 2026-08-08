# ADR 0023 — Keyword rulings live in one doc file per keyword

- Date: 2026-08-08
- Status: Proposed — accepted for implementation by `ai-artifacts/PLAN_2026_08_08_website-feedback-pass-2.md` (T2, T3)
- Scope: keyword taxonomy, website content build, card page rendering, hover preview
- Supersedes: [0015 — Keyword ruling text lives in the website registry](0015-keyword-definitions-in-registry.md)

## Context

ADR 0015 put all 73 ruling texts in one JSON registry, `website/content/keywords.json`,
because no parser could reliably lift them out of the four narrative modules.

That held. The complaint is different: the registry is one big machine-shaped file
inside `website/`, so a rules author who wants to reword one ruling edits JSON in the
website package, and adding a keyword means appending an object to a 700-line array.
The request is that a keyword be a file you can open, edit, or create by hand under
`docs/`, and that a new file publish itself on the next build.

Two constraints shape the answer:

- `docs/keywords/` already holds the four module docs, and the docs corpus loader
  publishes every `.md` under `docs/` as a doc page or fails the build. 73 new files
  there would flood the docs rail.
- The published-HTML gate `reminderIssues()` in `website/scripts/check-chrome.mjs`
  requires that any bold phrase resolving against a page's `#keyword-rulings` map is
  followed by a reminder span. The map is the hover-preview map. Which keywords
  appear where can therefore not be two unrelated switches.

## Decision

1. The registry becomes one file per keyword at `docs/keywords/{id}.md`, where `{id}`
   is the existing registry id (`mill-n`, `on-enter`, `abyssal-curse`, …).
   `website/content/keywords.json` is deleted.
2. Case decides the kind of file in `docs/keywords/`:
   lower-case kebab `.md` is keyword data and is never published as a doc page;
   UPPER_CASE `.md` is a module doc and is published. The docs corpus loader skips
   the former; nothing else changes about doc discovery.
3. Front matter carries `term`, `category`, `origin`, `doc`, `preview`, `reminder`,
   and `archetype` iff `category: archetype`. The body is the ruling: a single
   paragraph, plain text, 20–400 characters, no `<` or `>`.
4. `origin` stops driving presentation. Two explicit booleans replace it:
   - `preview` — show this ruling in the gallery hover box;
   - `reminder` — append this ruling as `(reminder)` text after the bold phrase in
     card rule text.
   Migration preserves today's behaviour (`preview = origin === 'essentia'`,
   `reminder = true`), then flips exactly two values: `mill-n.preview = true` so
   `Mill X` cards explain themselves on hover, and `counter.reminder = false` because
   `Counter` is a native Magic keyword that needs no gloss on the card.
5. The loader fails the build on `preview && !reminder`. That combination would put a
   term in the page ruling map with no reminder to satisfy the chrome gate.
6. `doc:` keeps naming the module that narrates the keyword. The per-keyword file is
   now the source of record for the **published ruling**; the module remains the
   source of record for the **taxonomy**.

## Consequences

- Adding a keyword is `touch docs/keywords/new-thing.md`, fill six front-matter keys,
  write one sentence, run `cd website && npm run content`. No code change.
- Rewording a ruling is a one-file diff under `docs/`, reviewable next to the rules
  it describes.
- The ruling can still drift from its module. `doc:` keeps the pair auditable, exactly
  as ADR 0015 left it.
- `origin` survives as provenance data (`magic` vs `essentia`) but no longer decides
  anything on screen — a reader can no longer infer presentation from it.
- 73 small files replace one large one. `git log` per keyword becomes useful; a bulk
  rename becomes 73 renames.
- ADR 0015's decision 4 (`origin` drives presentation; all 73 get an inline reminder)
  is superseded.

**Deviation recorded 2026-08-08 (T12).** Decision 3 says `archetype` is carried "iff
`category: archetype`". What shipped in `website/scripts/content/keywords.mjs` is
weaker: `archetype` is *required* when `category: archetype` and *allowed* on any other
category. One file needs that — `docs/keywords/on-cast-spellbook.md` is
`category: event, archetype: spellbook`, an event keyword that only exists inside one
archetype. Tightening the rule to a true "iff" would have forced that keyword to lie
about its category or lose its archetype link, so the looser rule was kept. Five files
carry `archetype:`; four have `category: archetype`.
