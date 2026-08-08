# ADR 0021 — Correct the MSE field parser, freeze the render-provenance hash input

- Date: 2026-08-07
- Status: Proposed — accepted for implementation by `ai-artifacts/PLAN_2026_08_07_website-feedback-pass-2.md` (T2)
- Scope: website content build, MSE source parsing, render provenance

## Context

Feedback reported three symptoms: *"None of the Nekroz cards have their card effect in their card page"*, *"Most cards dont have text rule on hover or text effect in their card page description"*, and *"Nekroz cards are missing text rule box on their hover"*.

Measured, not guessed: **26 of the 50 published cards** have `ruleText === ''` in the generated catalog. Every Nekroz card is among them, as is `Burning Abyss - Dante` and most non-archetype staples.

The cause is one line of parser ordering. `website/scripts/content/packages.mjs::parseFields` tests the field-start pattern before the continuation pattern:

```js
const match = /^\t([^:\n]+):(?:\s?(.*))?$/.exec(line);
if (match) { flush(); key = match[1].trim(); lines = [match[2] ?? '']; }
else if (key !== null && line.startsWith('\t\t')) lines.push(line.slice(2));
```

MSE writes its spell-check annotations back into card files on save — `<error-spelling:en_US:/magic.mse-game/dictionary/magic-words>`. Those contain colons. A `\t\t`-indented continuation line carrying one therefore matches the field-start regex, `flush()` writes `rule_text` as the empty string, and the remainder of the card's text is absorbed into a nonsense key. A card loses **all** of its rule text the moment any line of it contains a colon. The 24 cards that still render are simply the ones MSE has not annotated.

`.script/mse_content.py::field_values` carries the identical defect, with the identical regex and the identical branch order.

The straightforward fix — hoist the continuation branch — does not build:

```
Error: content: LOTA-0001-Alpha_0.1: stale render/provenance for bagooska
```

`packages.mjs` hashes `normalizedFields(fields)` into `visualSourceHash` and fails the build when it disagrees with the `sourceHash` recorded in each package's `render-provenance.json`. Those attestations were produced by the Python side, against the defective parse. Correcting the parser changes the hash of every affected card, so every attestation goes stale at once.

Two ways out were considered.

**Regenerate provenance.** Correct in principle, but the attestations are only meaningful as a record that a specific render came from a specific source; rewriting `sourceHash` in place without re-rendering asserts something that was never verified. Doing it honestly means a full MSE re-render of the package — a manual, tool-dependent, out-of-band operation that has nothing to do with a website text bug, and one that would have to be repeated for the five draft projects too.

**Freeze the hash input.** Keep a byte-identical copy of the old parser and route only `visualSourceHash` through it. The attestations keep meaning exactly what they meant when they were written; the content build reads correct text.

## Decision

1. `website/scripts/content/packages.mjs` gains a corrected `parseFields`: a `\t\t`-indented line is a continuation **unconditionally**, tested before the field-start pattern, and a field key may not contain a tab (`/^\t([^:\n\t]+):(?:\s?(.*))?$/`).
2. The pre-fix implementation survives verbatim as `legacyVisualFields(text)`, including its duplicate-field failure, and is the **only** input to `visualSourceHash`.
3. `.script/mse_content.py::field_values` is deliberately **not** changed. It feeds `visual_source_hash` and `semantic_fingerprint`, which the attestations are pinned to.
4. No `render-provenance.json` is modified. No re-render is performed. No card source under `cards_mse/` is edited.
5. The freeze lifts at the next full re-render of a package: once provenance is regenerated from a corrected Python parser, `legacyVisualFields` and this ADR can be deleted together.

Verified during planning: with the naive fix the content build fails as quoted above; with the frozen hash input it reports `50 current cards, 50 versions, 73 keywords` and **zero** cards with empty rule text. The newly-visible bold vocabulary introduces **zero** unknown keywords, so `extractKeywords` needs no registry additions, and `error-spelling` is already in `STRIPPED_MSE_TAGS`, so `validateMarkup` and the renderer accept the newly-visible markup unchanged.

## Consequences

- All 50 published cards show their effect on their card page and their keyword rulings on hover — three feedback items closed by one parser fix.
- The catalog's `keywords`, `ruleTextPlain` and `oracleNormalized` become correct for those 26 cards, which also repairs related-card suggestions and the card feed's descriptions.
- Two parsers live side by side in one file. That is deliberate duplication with a comment and this ADR explaining why; a reviewer who "cleans it up" re-breaks the build.
- `.script/lint_mse_card_style.py` still reads truncated text for the same 26 cards and therefore under-lints them. That is a known, recorded gap, not an oversight; it closes when the freeze lifts.
- `website/tests/unit/card-text.test.ts` asserts that no published card has empty rule text, so a regression of this class fails a test rather than silently blanking a page.
