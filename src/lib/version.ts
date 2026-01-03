export const VERSION = {
  major: 5,
  minor: 6,
  patch: 0,
  prerelease: '',
  buildDate: '2026-01-03',
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
