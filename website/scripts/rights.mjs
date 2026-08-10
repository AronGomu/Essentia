const SCHEMA_VERSION = 2;
export const RIGHTS_SCOPE =
  'Canonical standard renders and print masters underlying public card-image publication';
const KEY_RE = /^(release:.+):((?:display|print)-source)$/;
const SHA_RE = /^[0-9a-f]{64}$/;

function validateAssets(assets, label) {
  const keys = new Set();
  const tiers = new Map();
  for (const asset of assets) {
    const match = KEY_RE.exec(asset.key ?? '');
    if (
      !match ||
      !['display', 'print'].includes(asset.tier) ||
      !['canonical-render', 'print-master'].includes(asset.source) ||
      !SHA_RE.test(asset.sha256 ?? '') ||
      keys.has(asset.key)
    )
      throw new Error(`Invalid ${label} rights asset`);
    if (
      (asset.tier === 'display' && asset.source !== 'canonical-render') ||
      (asset.tier === 'print' && asset.source !== 'print-master') ||
      match[2] !== `${asset.tier}-source`
    )
      throw new Error(`Mismatched ${label} rights tier`);
    keys.add(asset.key);
    const values = tiers.get(match[1]) ?? new Set();
    values.add(asset.tier);
    tiers.set(match[1], values);
  }
  for (const values of tiers.values())
    if (!values.has('display') || !values.has('print'))
      throw new Error(
        `Public artifact blocked: ${label} rights tiers are incomplete`,
      );
}

export function checkRights(record, inventory) {
  if (
    record.schemaVersion !== SCHEMA_VERSION ||
    inventory.schemaVersion !== SCHEMA_VERSION ||
    record.scope !== RIGHTS_SCOPE ||
    inventory.scope !== RIGHTS_SCOPE ||
    !Array.isArray(record.assets) ||
    !Array.isArray(inventory.assets)
  )
    throw new Error('Unsupported rights schema or scope');

  validateAssets(inventory.assets, 'inventory');
  validateAssets(record.assets, 'approved');
  if (inventory.assets.length === 0) {
    if (record.assets.length)
      throw new Error('Public artifact blocked: stale rights records');
    return 'rights: no published assets require approval';
  }
  if (
    record.publicationStatus !== 'approved' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(record.approvedAt ?? '') ||
    !record.approvedBy
  )
    throw new Error(
      'Public artifact blocked: owner approval remains pending in content/asset-rights.json',
    );
  const approved = new Map(record.assets.map((asset) => [asset.key, asset]));
  const missing = inventory.assets.filter((asset) => {
    const item = approved.get(asset.key);
    return (
      !item ||
      item.sha256 !== asset.sha256 ||
      item.tier !== asset.tier ||
      item.source !== asset.source
    );
  });
  const inventoryKeys = new Set(inventory.assets.map((asset) => asset.key));
  const stale = record.assets.filter((asset) => !inventoryKeys.has(asset.key));
  if (missing.length || stale.length)
    throw new Error(
      `Public artifact blocked: ${missing.length} missing/changed and ${stale.length} stale rights records`,
    );
  return `rights: ${inventory.assets.length} approved assets`;
}
