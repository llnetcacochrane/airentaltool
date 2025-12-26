export const VERSION = {
  major: 5,
  minor: 4,
  patch: 0,
  prerelease: '',
  buildDate: '2025-12-26',
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
