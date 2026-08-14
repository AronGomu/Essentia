import { describe, expect, it } from 'vitest';
import { installScriptTrustIssues } from '../../scripts/check-install-scripts.mjs';

const integrityA = 'sha512-aaaaaaaa';
const integrityB = 'sha512-bbbbbbbb';

function lock() {
  return {
    packages: {
      '': { name: 'fixture' },
      'node_modules/a': {
        version: '1.0.0',
        integrity: integrityA,
        hasInstallScript: true,
      },
      'node_modules/b': {
        version: '2.0.0',
        integrity: integrityB,
        hasInstallScript: true,
      },
      'node_modules/plain': {
        version: '3.0.0',
        integrity: 'sha512-plain',
      },
    },
  };
}

function trust(): {
  schemaVersion: number;
  reviewedBy: string;
  packages: Record<
    string,
    { version: string; integrity: string; reason: string }
  >;
} {
  return {
    schemaVersion: 2,
    reviewedBy: 'reviewer',
    packages: {
      'node_modules/a': {
        version: '1.0.0',
        integrity: integrityA,
        reason: 'Required native helper.',
      },
      'node_modules/b': {
        version: '2.0.0',
        integrity: integrityB,
        reason: 'Optional native watcher.',
      },
    },
  };
}

describe('installScriptTrustIssues', () => {
  it('accepts exact lockfile install-script records', () => {
    expect(installScriptTrustIssues(lock(), trust())).toEqual([]);
  });

  it('rejects missing and stale trust records', () => {
    const value = trust();
    delete value.packages['node_modules/b'];
    value.packages['node_modules/stale'] = {
      version: '9.0.0',
      integrity: 'sha512-stale',
      reason: 'Stale fixture.',
    };

    expect(installScriptTrustIssues(lock(), value)).toEqual([
      'missing trust record for node_modules/b',
      'stale trust record for node_modules/stale',
    ]);
  });

  it('rejects version and integrity drift', () => {
    const value = trust();
    value.packages['node_modules/a']!.version = '1.0.1';
    value.packages['node_modules/b']!.integrity = 'sha512-drift';

    expect(installScriptTrustIssues(lock(), value)).toEqual([
      'integrity mismatch for node_modules/b: trusted sha512-drift, lockfile sha512-bbbbbbbb',
      'version mismatch for node_modules/a: trusted 1.0.1, lockfile 1.0.0',
    ]);
  });

  it('rejects trust for a package without hasInstallScript', () => {
    const value = trust();
    value.packages['node_modules/plain'] = {
      version: '3.0.0',
      integrity: 'sha512-plain',
      reason: 'Should not be trusted.',
    };

    expect(installScriptTrustIssues(lock(), value)).toEqual([
      'trust record for node_modules/plain targets package without hasInstallScript',
    ]);
  });

  it('rejects invalid reviewer and record shape', () => {
    const value = trust();
    value.reviewedBy = '';
    value.packages['node_modules/a']!.reason = '';

    expect(installScriptTrustIssues(lock(), value)).toEqual([
      'invalid reason in trust record for node_modules/a',
      'reviewedBy must be a non-empty string',
    ]);
  });

  it.each([
    [
      'schema version',
      (value: ReturnType<typeof trust>) => {
        value.schemaVersion = 1;
      },
      'schemaVersion must be 2',
    ],
    [
      'packages collection',
      (value: ReturnType<typeof trust>) => {
        value.packages = [] as unknown as ReturnType<typeof trust>['packages'];
      },
      'packages must be an object',
    ],
    [
      'record object',
      (value: ReturnType<typeof trust>) => {
        value.packages['node_modules/a'] = null as never;
      },
      'invalid trust record for node_modules/a',
    ],
    [
      'record version',
      (value: ReturnType<typeof trust>) => {
        value.packages['node_modules/a']!.version = '';
      },
      'invalid version in trust record for node_modules/a',
    ],
    [
      'record integrity',
      (value: ReturnType<typeof trust>) => {
        value.packages['node_modules/a']!.integrity = '';
      },
      'invalid integrity in trust record for node_modules/a',
    ],
  ])('rejects invalid %s shape', (_name, mutate, issue) => {
    const value = trust();
    mutate(value);
    expect(installScriptTrustIssues(lock(), value)).toContain(issue);
  });
});
