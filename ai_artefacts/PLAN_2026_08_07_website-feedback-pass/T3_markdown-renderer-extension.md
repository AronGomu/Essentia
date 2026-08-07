# T3: Markdown renderer extension

**Plan:** `./ai_artefacts/PLAN_2026_08_07_website-feedback-pass.md`
**Depends:** T1
**Commit outcome:** `renderSafeMarkdown` renders the constructs the repo's `docs/**/*.md` and blog posts actually use — h1–h4, ordered lists, nested bullets, fenced code, blockquotes, pipe tables, horizontal rules — while keeping its URL safety guarantees.

## Context (self-contained)

- Goal: ship the UX feedback backlog in `.dev/feedback.md` on the Astro site in `website/`. Two of the new header buttons point at `/docs/` and `/blog/`, which publish repo Markdown.
- This slice: the renderer those two route trees depend on. No page changes here — pure library work.
- Out of scope here: the docs loader (T4), docs routes (T5), blog (T6). Do not create pages or build scripts.
- Assumptions in force: no Markdown library is added — the locked CSP and zero-dependency posture stay. The renderer stays hand-written and escapes first.

## Requirements

- Same exported signature: `renderSafeMarkdown(value: string, base = '/'): string` in `website/src/lib/markdown.ts`.
- Everything is HTML-escaped before any inline pass; unsafe URLs still throw `Unsafe Markdown URL: <url>`.
- New block constructs: `#`–`####` headings, ordered lists, one level of nested unordered list, fenced code blocks, blockquotes, GFM pipe tables, `---` horizontal rules.
- Headings emit a stable `id` slug so anchors work: lowercase, non-alphanumerics to `-`, collapsed, trimmed.
- Existing behaviour for paragraphs, flat bullet lists, `**bold**`, `_em_`, `` `code` ``, and links is unchanged.

## Inputs

- `website/src/lib/markdown.ts` — current implementation. `escapeHtml`, `inline(value, base)`, `renderSafeMarkdown` split blocks on `/\n\s*\n/`. Only `##`/`###` headings and flat `-` lists are handled today; everything else becomes a `<p>`.
- `website/tests/unit/markdown.test.ts` — existing suite, extend it.
- Real corpus to satisfy: `docs/CONTEXT.md` (tables, nested bullets), `docs/keywords/EVENTS.md` (bullets with `—`), `docs/keywords/COSTS_AND_PROCEDURES.md` (```text fences), `docs/rules/DECK_BUILDING.md`.
- **From Depends (T1):** `npm run preflight` passes. Nothing else consumed.

## TDD

1. **Red** — add the cases below to `website/tests/unit/markdown.test.ts` first; they fail against today's renderer.
2. **Green** — extend `renderSafeMarkdown` block by block until green.
3. **Refactor** — extract one `block(text, base)` helper if the main function passes 90 lines. Keep green.

Exact output contracts:

- `# Title` → `<h1 id="title">Title</h1>`; `####` → `<h4 id="…">`. Slug function is exported: `export function headingSlug(text: string): string`.
- Ordered list block (every line matches `/^\d+\.\s+/`) → `<ol><li>…</li></ol>`, inline pass applied to the item text.
- Nested bullets: a line starting with exactly two spaces then `- ` opens `<ul>` inside the previous `<li>` and closes before the next top-level item. One level only; three or more leading spaces are treated as the same one nested level.
- Fenced code: a block whose first line matches `/^```/` and whose last line is ```` ``` ```` → `<pre><code>` + escaped inner text (no inline pass, no link rewriting) + `</code></pre>`. An unterminated fence throws `Unterminated code fence`.
- Blockquote (every line starts with `> `) → `<blockquote><p>…</p></blockquote>` with the inline pass on the stripped text.
- Table: first line `| a | b |`, second line `| --- | --- |` (dashes and optional colons), remaining lines are rows → `<table><thead><tr><th>a</th>…</tr></thead><tbody><tr><td>…</td></tr></tbody></table>`. Cell text goes through the inline pass. Row cell count is padded/truncated to the header count.
- `---` alone in a block → `<hr>`.

## Test plan

| Test | Input | Expect |
| ---- | ----- | ------ |
| `renders h1 through h4 with slugged ids` | `# Project context` | `<h1 id="project-context">Project context</h1>` |
| `slugs punctuation out of ids` | `## Open/locked lifecycle (v2)` | contains `id="open-locked-lifecycle-v2"` |
| `renders ordered lists` | `1. first\n2. second` | `<ol><li>first</li><li>second</li></ol>` |
| `nests one level of bullets` | `- top\n  - child` | `<ul><li>top<ul><li>child</li></ul></li></ul>` |
| `renders fenced code without inline processing` | ``` ```text\n**Alternative Cost** — x\n``` ``` | contains `<pre><code>**Alternative Cost** — x</code></pre>` and no `<strong>` |
| `throws on an unterminated fence` | ``` ```text\nabc ``` | throws `Unterminated code fence` |
| `renders blockquotes` | `> note` | `<blockquote><p>note</p></blockquote>` |
| `renders pipe tables with inline cells` | `\| Term \| Doc \|\n\| --- \| --- \|\n\| **Mill N** \| [x](/docs/) \|` | contains `<th>Term</th>`, `<strong>Mill N</strong>`, `href="/docs/"` |
| `renders a horizontal rule` | `---` | `<hr>` |
| `still rejects unsafe URLs` | `[x](javascript:alert(1))` | throws `Unsafe Markdown URL: javascript:alert(1)` |
| `still renders paragraphs and flat lists` | existing cases in the file | unchanged |

Run: `cd website && npx vitest run tests/unit/markdown.test.ts`

## Impl steps

- [ ] 1. Add the eleven cases above to `website/tests/unit/markdown.test.ts`.
- [ ] 2. In `website/src/lib/markdown.ts`, export `headingSlug(text)`.
- [ ] 3. Split the fenced-code pass out of the paragraph split: before splitting on blank lines, extract ```` ``` ````-delimited regions so blank lines inside code do not break the block.
- [ ] 4. Widen the heading regex from `/^(#{2,3})\s+(.+)$/` to `/^(#{1,4})\s+(.+)$/` and emit `id={headingSlug(text)}`.
- [ ] 5. Add the ordered-list branch (`/^\d+\.\s+/` on every line).
- [ ] 6. Add nested-bullet handling to the unordered-list branch.
- [ ] 7. Add the blockquote branch.
- [ ] 8. Add the pipe-table branch (header + separator + rows).
- [ ] 9. Add the `---` horizontal-rule branch, placed before the paragraph fallback.
- [ ] 10. Run `npm run format`, `npm run lint`, `npm run check`.

## Outputs

- Files touched: `website/src/lib/markdown.ts`, `website/tests/unit/markdown.test.ts`.
- Public API: `renderSafeMarkdown` (unchanged signature), `headingSlug` (new export).
- No config or migration.

## Validation

- [ ] `cd website && npx vitest run tests/unit/markdown.test.ts` — all pass
- [ ] `cd website && npm run test` — full unit suite green (card design notes still render)
- [ ] `cd website && npm run check && npm run lint && npm run format:check` — exit 0
- [ ] `cd website && npm run build` — exit 0
- [ ] app functional — card "Design notes" sections still render identically
- [ ] commit msg draft: `feat(website): extend the safe Markdown renderer for the docs corpus`
