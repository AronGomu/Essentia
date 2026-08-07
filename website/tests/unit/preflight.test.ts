import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import {
  HERO_SOURCES,
  preflightIssues,
} from '../../scripts/check-preflight.mjs';

const run = promisify(execFile);

describe('R9 importing the module does not run the gate', () => {
  it('produces no output and does not throw when merely imported', async () => {
    const module = path.resolve(
      import.meta.dirname,
      '../../scripts/check-preflight.mjs',
    );
    const { stdout } = await run('node', [
      '--input-type=module',
      '-e',
      `await import(${JSON.stringify(module)});`,
    ]);
    // Without the main-module guard this prints the `preflight:` banner — or,
    // on a host missing `original_images/` or `node_modules/astro`, throws at
    // import time and takes every test in this file down with it.
    expect(stdout).toBe('');
  });
});

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
