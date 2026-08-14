import { execFileSync } from 'node:child_process';

const allowed = new Set([
  'MIT',
  'ISC',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'Apache-2.0',
  'Apache-2.0 AND LGPL-3.0-or-later',
  'LGPL-3.0-or-later',
  'BlueOak-1.0.0',
  'MPL-2.0',
  'Python-2.0',
  '0BSD',
  'CC0-1.0',
]);
const npmCli = process.env.npm_execpath;
const command = npmCli ? process.execPath : 'npm';
const args = npmCli
  ? [npmCli, 'query', ':not(.dev)', '--json']
  : ['query', ':not(.dev)', '--json'];
const packages = JSON.parse(
  execFileSync(command, args, {
    encoding: 'utf8',
  }),
);
const failures = [];
for (const item of packages) {
  if (item.name === 'ygo-mtg-showcase') continue;
  const values = Array.isArray(item.license) ? item.license : [item.license];
  if (
    !values.some((license) =>
      allowed.has(typeof license === 'string' ? license : license?.type),
    )
  )
    failures.push(
      `${item.name}@${item.version}: ${JSON.stringify(item.license ?? 'UNKNOWN')}`,
    );
}
if (failures.length)
  throw new Error(
    `Forbidden or unknown production licenses:\n${failures.join('\n')}`,
  );
process.stdout.write(
  `licenses: ${packages.length - 1} production packages allowed\n`,
);
