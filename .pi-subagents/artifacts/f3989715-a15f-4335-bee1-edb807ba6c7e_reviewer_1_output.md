## Review
- **Low — `website/tests/e2e/showcase.spec.ts:7-9`:** Brand test checks `/Essentia/` only. Stale title like `YGO × MTG — Essentia` still passes. No assertions cover header/sidebar exact text, RSS title, full-name restriction.
- **Correct — `website/src/components/Navigation.svelte:74`, `website/src/layouts/BaseLayout.astro:71`:** Sidebar/header render only `Essentia`. Desktop brand a11y label updated.
- **Correct — `website/src/components/Seo.astro:23-33`, `website/src/pages/feed.xml.ts:22-24`:** Page/OG/RSS metadata use short name.
- **Correct — `website/src/pages/legal/index.astro:6-14`:** Title uses short name. Legal first mention uses permitted full `YGO × MTG: Essentia`.
- **Correct — rendered output:** 6 built HTML pages contain exact `Essentia` in both brand links. Titles use short name. Full name appears only on legal page. `feed.xml` channel title = `Essentia card updates`.
- **Correct — malformed markup:** Astro build/dist scan passed. 6 HTML outputs parsed. RSS XML well-formed.
- **Residual risk — `website/tests/e2e/showcase.spec.ts:7-15`:** Browser/a11y E2E attestation blocked by missing host libs. Dynamic catalog routes not rendered because current catalog has 0 releases/sections/cards.
- **Input gap:** Requested `plan.md`, `progress.md` absent at supplied paths.