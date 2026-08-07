import { existsSync } from 'node:fs';

/** slug -> repo-root-relative path of the original illustration */
export const HERO_SOURCES = {
  'non-archetype':
    'original_images/Effect Monster/Ash Blossom & Joyous Spring.jpg',
  'burning-abyss':
    'original_images/Xyz/Dante, Traveler of the Burning Abyss.jpg',
  shaddoll: 'original_images/Fusion/El Shaddoll Construct.jpg',
  nekroz: 'original_images/Ritual/Nekroz of Trishula.jpg',
  spellbook: 'original_images/Effect Monster/High Priestess of Prophecy.jpg',
};

/**
 * @param {{ nodeVersion: string, hasAstro: boolean, missingSources: string[] }} env
 * @returns {string[]} one human-readable line per unmet prerequisite, empty when ready
 */
export function preflightIssues(env) {
  const issues = [];
  if (!/^v?24\./.test(env.nodeVersion))
    issues.push(`Node 24 required, found ${env.nodeVersion}`);
  if (!env.hasAstro)
    issues.push(
      'website/node_modules missing — run: cd website && npm install',
    );
  for (const path of env.missingSources)
    issues.push(`source illustration missing: ${path}`);
  return issues;
}

const repoRoot = new URL('../../', import.meta.url);
const missingSources = Object.values(HERO_SOURCES).filter(
  (rel) => !existsSync(new URL(rel, repoRoot)),
);
const issues = preflightIssues({
  nodeVersion: process.version,
  hasAstro: existsSync(
    new URL('../node_modules/astro/package.json', import.meta.url),
  ),
  missingSources,
});
if (issues.length) throw new Error(`preflight failed:\n${issues.join('\n')}`);
process.stdout.write(
  'preflight: node 24, deps, 5 source illustrations ready\n',
);
