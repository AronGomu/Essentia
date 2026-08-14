import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function installScriptTrustIssues(lock, trust) {
  const issues = [];
  const lockPackages = isRecord(lock?.packages) ? lock.packages : {};
  const trustedPackages = isRecord(trust?.packages) ? trust.packages : {};

  if (trust?.schemaVersion !== 2) issues.push('schemaVersion must be 2');
  if (typeof trust?.reviewedBy !== 'string' || !trust.reviewedBy.trim())
    issues.push('reviewedBy must be a non-empty string');
  if (!isRecord(trust?.packages)) issues.push('packages must be an object');

  for (const [location, record] of Object.entries(trustedPackages)) {
    if (!isRecord(record)) {
      issues.push(`invalid trust record for ${location}`);
      continue;
    }
    if (typeof record.version !== 'string' || !record.version)
      issues.push(`invalid version in trust record for ${location}`);
    if (typeof record.integrity !== 'string' || !record.integrity)
      issues.push(`invalid integrity in trust record for ${location}`);
    if (typeof record.reason !== 'string' || !record.reason.trim())
      issues.push(`invalid reason in trust record for ${location}`);
  }

  for (const [location, metadata] of Object.entries(lockPackages)) {
    if (!metadata?.hasInstallScript) continue;
    const record = trustedPackages[location];
    if (!isRecord(record)) {
      issues.push(`missing trust record for ${location}`);
      continue;
    }
    if (record.version && record.version !== metadata.version)
      issues.push(
        `version mismatch for ${location}: trusted ${record.version}, lockfile ${metadata.version}`,
      );
    if (record.integrity && record.integrity !== metadata.integrity)
      issues.push(
        `integrity mismatch for ${location}: trusted ${record.integrity}, lockfile ${metadata.integrity}`,
      );
  }

  for (const location of Object.keys(trustedPackages)) {
    const metadata = lockPackages[location];
    if (!metadata) issues.push(`stale trust record for ${location}`);
    else if (!metadata.hasInstallScript)
      issues.push(
        `trust record for ${location} targets package without hasInstallScript`,
      );
  }

  return [...new Set(issues)].sort();
}

async function main() {
  const [lock, trust] = await Promise.all([
    readFile(new URL('../package-lock.json', import.meta.url), 'utf8').then(
      JSON.parse,
    ),
    readFile(
      new URL('../trusted-install-scripts.json', import.meta.url),
      'utf8',
    ).then(JSON.parse),
  ]);
  const issues = installScriptTrustIssues(lock, trust);
  if (issues.length) {
    process.stderr.write(
      `Install-script trust check failed:\n${issues.join('\n')}\n`,
    );
    process.exitCode = 1;
    return;
  }
  const count = Object.values(lock.packages).filter(
    (metadata) => metadata.hasInstallScript,
  ).length;
  process.stdout.write(
    `install scripts: ${count} exact lockfile entries reviewed\n`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await main();
