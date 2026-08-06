import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve(process.env.OUT_DIR ?? 'dist');
const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(file);
    else files.push({ file, size: (await stat(file)).size });
  }
}
await walk(dist);
const js = files.filter(({ file }) => file.endsWith('.js'));
const html = files.filter(({ file }) => file.endsWith('.html'));
// Print masters are proxy-printing source, not page weight. They are excluded
// from the per-page image budgets and tracked under their own total ceiling.
const isPrintMaster = ({ file }) => /-print\.png$/.test(file);
const printMasters = files.filter(isPrintMaster);
const images = files.filter(
  (item) => /\.(?:png|webp|avif)$/.test(item.file) && !isPrintMaster(item),
);
const sum = (items) => items.reduce((total, item) => total + item.size, 0);
const issues = [];
if (sum(js) > 350 * 1024) issues.push(`JS total ${sum(js)} > 350 KiB`);
for (const item of html)
  if (item.size > 500 * 1024) issues.push(`${item.file}: HTML > 500 KiB`);
for (const item of images)
  if (item.size > 3 * 1024 * 1024) issues.push(`${item.file}: image > 3 MiB`);
if (sum(images) > 180 * 1024 * 1024)
  issues.push(`image total ${sum(images)} > 180 MiB`);
if (sum(printMasters) > 400 * 1024 * 1024)
  issues.push(`print master total ${sum(printMasters)} > 400 MiB`);
if (issues.length)
  throw new Error(`Artifact budgets exceeded:\n${issues.join('\n')}`);
process.stdout.write(
  `budgets: ${js.length} JS, ${html.length} HTML, ${images.length} images, ` +
    `${printMasters.length} print masters (${Math.round(sum(printMasters) / 1024 / 1024)} MiB) within limits\n`,
);
