import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { checkRights, RIGHTS_SCOPE } from '../../scripts/rights.mjs';

const approval = JSON.parse(
  await readFile(
    new URL('../../content/asset-rights.json', import.meta.url),
    'utf8',
  ),
);
const inventory = JSON.parse(
  await readFile(
    new URL('../../src/generated/rights-inventory.json', import.meta.url),
    'utf8',
  ),
);

describe('asset rights', () => {
  it('binds 54 display sources and 54 print masters independently', () => {
    expect(inventory.scope).toBe(RIGHTS_SCOPE);
    expect(inventory.assets).toHaveLength(108);
    expect(
      inventory.assets.filter(
        (asset: { tier: string }) => asset.tier === 'display',
      ),
    ).toHaveLength(54);
    expect(
      inventory.assets.filter(
        (asset: { tier: string }) => asset.tier === 'print',
      ),
    ).toHaveLength(54);
    expect(checkRights(approval, inventory)).toBe(
      'rights: 108 approved assets',
    );
  });

  it.each(['display', 'print'])('%s hash drift blocks publication', (tier) => {
    const changed = structuredClone(inventory);
    const asset = changed.assets.find(
      (candidate: { tier: string }) => candidate.tier === tier,
    );
    asset.sha256 = '0'.repeat(64);
    expect(() => checkRights(approval, changed)).toThrow(/missing\/changed/);
  });
});
