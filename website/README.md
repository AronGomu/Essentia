# Essentia showcase

Read-only Astro + Svelte publication UI for immutable card packages.

## Publication source

Build reads only release packages under:

- `../cards_mse/02_alpha/`
- `../cards_mse/04_beta/`
- `../cards_mse/06_released/`

Draft, Pre-ALPHA, and Pre-BETA projects never enter website catalog. A repository with only drafts builds an explicit zero-card state. `content/sections.json` supplies presentation metadata; `content/identities.json` maps stable IDs to MSE source references without duplicating card names.

Each package must pass hash, aggregate, render-provenance, identity, and metadata validation before any generated output is written. Current card routes select highest lifecycle rank, then highest semantic version. Exact historical versions remain at package-specific routes.

## Local development

From `website/`:

```bash
npm ci
npm run dev
```

Use Node version declared in `package.json`. MSE installation is unnecessary for website builds because immutable packages contain canonical renders.

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

`content/asset-rights.json` records approval for every published package render hash. Empty publication has no assets to approve. Any non-empty inventory remains deployment-blocked until owner approval matches generated `src/generated/rights-inventory.json`.

## Build output

- `src/generated/catalog.ts`: releases, exact card versions, current cards, sections, updates.
- `src/generated/explanations.json`: optional authored design notes.
- `src/generated/rights-inventory.json`: package-scoped render hashes.
- `public/generated/releases/`: deterministic web derivatives grouped by package.

Generated files are build products. Do not hand-edit them.

## Deployment

`.github/workflows/verify-website.yml` verifies Python lifecycle rules, Node checks, two base-path builds, browser matrix, links, budgets, leak scan, and rights. `.github/workflows/deploy-pages.yml` deploys only SHA-bound artifacts from successful `main` verification runs.
