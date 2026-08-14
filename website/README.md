# Essentia showcase

Read-only Astro + Svelte publication UI for alpha/beta/release card packages.

## Publication source

Build reads only release packages under:

- `../cards_mse/01_alpha/`
- `../cards_mse/02_beta/`
- `../cards_mse/03_release/`

Draft projects never enter website catalog. Open and locked packages both publish when artifacts validate. A repository with only drafts builds an explicit zero-card state. `content/sections.json` supplies presentation metadata; `content/identities.json` maps stable IDs to MSE source references without duplicating card names.

Each package must pass hash, aggregate, render-provenance, identity, and metadata validation before any generated output is written. Current card routes select highest lifecycle rank, then highest semantic version. Exact historical versions remain at package-specific routes.

## Local development

From `website/`:

```bash
npm ci
npm run dev
```

Use Node version declared in `package.json`. MSE installation is unnecessary for website builds because packages contain canonical renders.

## Regenerating site content

Edit any `docs/**/*.md` or `blog/*.md` at the repo root, then run `cd website && npm run content`. That regenerates `website/src/generated/catalog.ts` and the public asset copies.

The pipeline reads, besides the packages themselves:

- `docs/**/*.md` and `blog/*.md` — doc and post bodies.
- `docs/keywords/{id}.md` — one lower-case file per keyword; its body is the published ruling and its front matter carries `preview` and `reminder`. Adding a file publishes a new keyword with no code change.
- `content/sections.json` — the section list and its presentation metadata.
- `content/section-intros/{slug}.md` — the intro prose printed above each section, one file per section.
- `content/reading-order.json` — the order and grouping of documentation pages and blog posts in the rail.
- `content/identities.json`, `content/art-provenance.json`, `content/asset-rights.json`, `content/color-overrides.json`, `content/explanations/` — identity, provenance, rights, colour and design-note inputs.

`npm run dev` and `npm run build` already run it first, so you only need it explicitly when you want to refresh data without starting a server. `npm run content:check` verifies the generated output is up to date without writing.

## Linking cards from prose

Write `[[Card Name]]` in any doc, blog post, section intro or design note. It renders as a link to the card page carrying the gallery hover preview, so pointing at the name shows the render and its rulings without leaving the page.

- `[[Nekroz - Trishula]]` → the printed name.
- `[[Nekroz - Trishula|the finisher]]` → your own words, same link and preview.
- `[[Trishula]]` → archetype cards resolve by title alone, unless two archetypes print that title.
- Case, straight/typed quotes and dash style do not matter: `[[maxx "c"]]` finds `Maxx “C”`.
- Historical names keep working — a renamed card still resolves through its former name.

An unknown or ambiguous name **fails the build** rather than rendering as plain text, so a mention can never quietly lose its link.

Decklists use a fence instead, and link every entry:

````text
```decklist
Main Deck (40 cards)
2 Burning Abyss - Graff
14 Swamp

Sideboard (10 cards)
2 Burning Abyss - Dante
```
````

Every line is `quantity name`. Any other line must be a zone label — `Main Deck`, `Deck`, `Sideboard`, `Extra Deck`, `Extra`, `Flex`, optionally with a `(40 cards)` count. A card name without a quantity is an error, so nothing drops out of a list unnoticed. Basic lands are the one entry that stays unlinked.

## Checks

```bash
npm run format:check
npm run lint
npm run check
npm run test
npm run build
npm run links:check
npm run budgets:check
npm run rights:check
npm run immutability:check
npm run test:e2e
```

`npm run ci` runs format, lint, Astro checks, unit tests, and production build. Root CI also runs Python lifecycle/package validation plus merge-base immutability checks.

## Asset rights

`content/asset-rights.json` independently binds each canonical 750×1046 standard render and each 1500×2092 print master underlying card-image publication. Web display/print derivatives currently derive from the print master; canonical standard render remains independently attested, so drift in either tier blocks publication. Empty publication has no assets to approve; non-empty deployment stays blocked until owner approval exactly matches generated `src/generated/rights-inventory.json`.

## Build output

- `src/generated/catalog.ts`: releases, exact card versions, current cards, sections, updates.
- `src/generated/explanations.json`: optional authored design notes.
- `src/generated/rights-inventory.json`: package-scoped display-source and print-source hashes.
- `public/generated/releases/`: deterministic web derivatives grouped by package.

Generated files are build products. Do not hand-edit them.

## Deployment

`.github/workflows/verify-website.yml` verifies Python lifecycle rules, Node checks, two base-path builds, browser matrix, links, budgets, leak scan, and rights. `.github/workflows/deploy-pages.yml` deploys only SHA-bound artifacts from successful `main` verification runs.
