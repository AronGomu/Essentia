const LIFECYCLE_VERSION_RE = /^(Alpha|Beta|Release)_(\d+\.\d+(?:\.\d+)?)$/;
const STAGE_PREFIX_RANK = { Alpha: 1, Beta: 2, Release: 3 };

function numericVersionKey(value) {
  if (!/^\d+\.\d+(?:\.\d+)?$/.test(value)) {
    throw new Error(`Invalid numeric version: ${value}`);
  }
  return value.split('.').map(Number);
}

export function parseLifecycleVersion(value) {
  const match = LIFECYCLE_VERSION_RE.exec(value);
  if (!match) {
    throw new Error(`Invalid publication version: ${value}`);
  }
  return {
    prefix: match[1],
    prefixRank: STAGE_PREFIX_RANK[match[1]],
    numbers: numericVersionKey(match[2]),
  };
}

export function compareSemanticVersion(leftValue, rightValue) {
  const left = numericVersionKey(leftValue);
  const right = numericVersionKey(rightValue);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0);
    if (delta) return delta;
  }
  return 0;
}

export function compareLifecycleVersion(leftValue, rightValue) {
  const left = parseLifecycleVersion(leftValue);
  const right = parseLifecycleVersion(rightValue);
  const prefixDelta = left.prefixRank - right.prefixRank;
  if (prefixDelta) return prefixDelta;
  for (
    let index = 0;
    index < Math.max(left.numbers.length, right.numbers.length);
    index += 1
  ) {
    const delta = (left.numbers[index] ?? 0) - (right.numbers[index] ?? 0);
    if (delta) return delta;
  }
  return 0;
}

export function comparePublicationVersion(left, right) {
  return (
    left.stageRank - right.stageRank ||
    compareLifecycleVersion(left.version, right.version) ||
    left.releasedOn.localeCompare(right.releasedOn) ||
    left.packageId.localeCompare(right.packageId)
  );
}

export function selectCurrentVersion(versions) {
  if (!versions.length) throw new Error('Cannot select from empty versions');
  const keys = new Set();
  for (const version of versions) {
    const key = `${version.stage}:${version.version}`;
    if (keys.has(key)) {
      throw new Error(`Duplicate lifecycle/version: ${key}`);
    }
    keys.add(key);
  }
  return [...versions].sort(comparePublicationVersion).at(-1);
}
