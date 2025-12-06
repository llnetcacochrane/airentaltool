export const VERSION = {
  major: 4,
  minor: 2,
  patch: 10,
  prerelease: 'beta',
  buildDate: '2025-12-06',
};

export function getVersionString(): string {
  const { major, minor, patch, prerelease } = VERSION;
  const base = `${major}.${minor}.${patch}`;
  return prerelease ? `${base}-${prerelease}` : base;
}

export function getFullVersionString(): string {
  return `v${getVersionString()}`;
}

export function getVersionWithDate(): string {
  return `${getFullVersionString()} (${VERSION.buildDate})`;
}
