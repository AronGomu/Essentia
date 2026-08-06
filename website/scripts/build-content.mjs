import { build } from './content/orchestrator.mjs';

await build({ checkOnly: process.argv.includes('--check') });
