import { describe, expect, it } from 'vitest';
import {
  HERO_SOURCES,
  preflightIssues,
} from '../../scripts/check-preflight.mjs';

describe('preflightIssues', () => {
  it('reports nothing when every prerequisite is met', () => {
    expect(
      preflightIssues({
        nodeVersion: 'v24.4.0',
        hasAstro: true,
        missingSources: [],
      }),
    ).toEqual([]);
  });

  it('flags a wrong node major', () => {
    const issues = preflightIssues({
      nodeVersion: 'v22.11.0',
      hasAstro: true,
      missingSources: [],
    });
    expect(issues).toContain('Node 24 required, found v22.11.0');
  });

  it('flags missing dependencies and missing art together', () => {
    const issues = preflightIssues({
      nodeVersion: 'v24.4.0',
      hasAstro: false,
      missingSources: ['original_images/Ritual/Nekroz of Trishula.jpg'],
    });
    expect(issues).toHaveLength(2);
    expect(issues[0]).toBe(
      'website/node_modules missing — run: cd website && npm install',
    );
    expect(issues[1]).toBe(
      'source illustration missing: original_images/Ritual/Nekroz of Trishula.jpg',
    );
  });

  it('lists one line per missing source', () => {
    const missingSources = [
      'original_images/Effect Monster/Ash Blossom & Joyous Spring.jpg',
      'original_images/Xyz/Dante, Traveler of the Burning Abyss.jpg',
      'original_images/Fusion/El Shaddoll Construct.jpg',
    ];
    const issues = preflightIssues({
      nodeVersion: 'v24.4.0',
      hasAstro: true,
      missingSources,
    });
    expect(issues).toHaveLength(3);
    for (const issue of issues) {
      expect(issue.startsWith('source illustration missing: ')).toBe(true);
    }
  });

  it('HERO_SOURCES covers all five sections', () => {
    expect(Object.keys(HERO_SOURCES)).toEqual([
      'non-archetype',
      'burning-abyss',
      'shaddoll',
      'nekroz',
      'spellbook',
    ]);
  });
});
