import { readFile } from 'node:fs/promises';

const record = JSON.parse(
  await readFile(
    new URL('../content/asset-rights.json', import.meta.url),
    'utf8',
  ),
);
const inventory = JSON.parse(
  await readFile(
    new URL('../src/generated/rights-inventory.json', import.meta.url),
    'utf8',
  ),
);
if (record.schemaVersion !== 1 || inventory.schemaVersion !== 1)
  throw new Error('Unsupported rights schema');
if (inventory.assets.length === 0) {
  if (record.assets.length)
    throw new Error('Public artifact blocked: stale rights records');
  process.stdout.write('rights: no published assets require approval\n');
} else {
  if (
    record.publicationStatus !== 'approved' ||
    !record.approvedAt ||
    !record.approvedBy
  ) {
    throw new Error(
      'Public artifact blocked: owner approval remains pending in content/asset-rights.json',
    );
  }
  const approved = new Map(
    record.assets.map((asset) => [asset.key, asset.sha256]),
  );
  const missing = inventory.assets.filter(
    (asset) => approved.get(asset.key) !== asset.sha256,
  );
  const stale = record.assets.filter(
    (asset) => !inventory.assets.some((item) => item.key === asset.key),
  );
  if (missing.length || stale.length)
    throw new Error(
      `Public artifact blocked: ${missing.length} missing/changed and ${stale.length} stale rights records`,
    );
  process.stdout.write(`rights: ${inventory.assets.length} approved assets\n`);
}
