# Product

## Register

brand

## Platform

web

## Users

Primary users are English-speaking Yu-Gi-Oh! and Magic: The Gathering players, cube designers, and card-design enthusiasts browsing a public collection. They need to understand how familiar Yu-Gi-Oh! cards were adapted into Magic rules, inspect individual cards, compare archetypes, and follow meaningful updates. MVP interface, routes, metadata, authored explanations, and published card content are English only; localization is deferred until after MVP.

## Product Purpose

**YGO × MTG: Essentia**, usually shortened to **Essentia**, presents a read-only, source-backed catalog of Yu-Gi-Oh!-inspired Magic cards. Its name reflects its purpose: preserve the essence of Yu-Gi-Oh! inside Magic's card-game rules. It turns MSE project data and canonical renders into an accessible showcase: a browsable living catalog of defined archetypes plus non-archetype staple sections, stable card pages, immutable package history, and a clean presentation mode. Success means visitors can find a card quickly, understand its role, trust that text and visuals match the source projects, and feel the Yu-Gi-Oh! identity survive inside Magic's rules engine.

## Positioning

Faithful Yu-Gi-Oh! gameplay identities, rebuilt as credible Magic cards rather than translated literally.

## Conversion & proof

- Primary CTA: explore a catalog section (non-archetype staple section or defined archetype).
- Secondary CTA: search for a specific card.
- The line a visitor remembers after 10 seconds: “Yu-Gi-Oh! feel, playable under Magic rules.”
- Belief ladder: these are recognizable adaptations; each works inside Magic's rules; defined archetypes and non-archetype staples form a coherent cube catalog; source data and canonical renders are maintained deliberately; updates preserve an auditable history.
- Proof on hand: ten editable English MSE projects under `cards_mse/00_drafts/`; modular design and rules documentation under `docs/`; stable identity, package-hash, aggregate, render-provenance, and immutable lifecycle tooling. No release package is published until selection and promotion are complete.

## Brand Personality

Arcane, exact, kinetic. The site should evoke discovery and spectacle without sacrificing editorial clarity. Yu-Gi-Oh! supplies energy, character art, and supernatural scale; Magic supplies compositional restraint, readable hierarchy, and rules credibility.

## Anti-references

Do not imitate a generic neon-gamer dashboard, a Yu-Gi-Oh! duel HUD, or an MTG parchment deck builder. Avoid dark SaaS conventions, purple-gradient glassmorphism, ornamental fantasy clutter, and effects that compete with card art or transcription. The site must not feel like an unlicensed imitation of either parent game; it should present the project's own hybrid identity.

## Design Principles

1. **Cards remain artifacts.** Canonical renders and artwork lead; interface chrome frames them rather than restyling them.
2. **Energy earns focus.** Motion and glow respond to deliberate interaction or introduce a major surface; they never become ambient noise.
3. **Clarity proves craft.** Parsed text, dates, status, filters, and source-backed structure remain readable beside expressive imagery.
4. **One system, many sections.** Layout and behavior stay stable across non-archetype staple sections and defined archetypes; only controlled accent tokens and imagery change the atmosphere.
5. **History stays visible.** New and updated states, stable routes, exact card versions, and immutable release packages make change legible instead of disposable.

## Accessibility & Inclusion

Target WCAG 2.2 AA for text, controls, focus indicators, target sizing, keyboard operation, and responsive reflow. Preserve full content at 200% text zoom and 400% reflow. Support forced colors and non-color status cues. Honor `prefers-reduced-motion` by removing tilt, parallax, ambient movement, and decorative transitions while retaining equivalent focus and state feedback. Card renders receive concise alt text with adjacent semantic transcription rather than rules-heavy alt strings.
