# ADR 0015 — Keyword ruling text lives in the website registry

- Date: 2026-08-07
- Status: Proposed — accepted for implementation by `ai-artifacts/archive/PLAN_2026_08_07_website-feedback-pass.md` (T18)
- Scope: keyword taxonomy, website content build, card page rendering

## Context

Website feedback asks for two things that need per-keyword ruling text at render time:

- card rules text prints each bold keyword followed by its ruling,
- the card hover preview shows one box per Essentia-specific keyword.

Docs are the narrative source of truth for the closed taxonomy (`docs/KEYWORDS.md` plus the four `docs/keywords/*.md` modules and four archetype `KEYWORDS.md` files). The obvious route was to parse definitions out of those files, as `WEBSITE_V2_SPEC.md` §1.2 planned.

Measurement says otherwise. Of the 73 terms in `website/content/keywords.json`, only 16 have a machine-locatable definition block (`### Term`, `## Term`, or `- **Term** — …`). The rest are either Magic evergreens named in a prose sentence (`Flying`, `Trample`, `Vigilance`, `Ward N`, …) or families documented as a group (`Summon / Hand Summon`, `Salvage / Reclaim / Release`). A parser strict enough to be trustworthy would fail the build on 57 terms; a parser loose enough to pass would silently produce wrong rulings.

## Decision

1. `website/content/keywords.json` moves to `schemaVersion: 2` and every entry carries three new required fields:
   - `definition` — plain text, 20–400 characters, no markup;
   - `origin` — `magic` (a Magic evergreen whose meaning is unchanged) or `essentia` (defined by this project);
   - `doc` — repo-relative path to the owning documentation module.
2. `loadKeywordRegistry()` fails the build when any field is missing, malformed, or names a `doc` file that does not exist.
3. Docs remain the narrative source of record. The registry ruling is a one-sentence restatement, and the `doc` back-reference names the module that owns the full treatment.
4. `origin` drives presentation: only `essentia` keywords get a hover ruling box. All 73 get an inline reminder in card rules text.

## Consequences

- Adding a keyword now requires writing its ruling, choosing its origin, and naming its owning doc. That is one more authoring step, enforced by the build.
- A ruling can drift from its doc. The `doc` field makes the pair auditable; a future check may diff them.
- The 22 `magic` / 51 `essentia` split is data, not a hard-coded list in a component.
- `WEBSITE_V2_SPEC.md` §1.2 step 1 (parse definitions out of docs) is superseded.
