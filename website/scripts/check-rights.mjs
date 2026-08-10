import { readFile } from 'node:fs/promises';
import { checkRights } from './rights.mjs';

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
process.stdout.write(`${checkRights(record, inventory)}\n`);
