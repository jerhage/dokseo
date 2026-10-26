const FALLBACK_NAME = 'This browser';

const BROWSERS: readonly (readonly [string, string])[] = [
  ['Edg/', 'Edge'],
  ['EdgA/', 'Edge'],
  ['OPR/', 'Opera'],
  ['Firefox/', 'Firefox'],
  ['FxiOS/', 'Firefox'],
  ['CriOS/', 'Chrome'],
  ['Chrome/', 'Chrome'],
  ['Safari/', 'Safari'],
];

const PLATFORMS: readonly (readonly [string, string])[] = [
  ['iPhone', 'iPhone'],
  ['iPad', 'iPad'],
  ['Android', 'Android'],
  ['Macintosh', 'Mac'],
  ['Windows', 'Windows'],
  ['CrOS', 'ChromeOS'],
  ['Linux', 'Linux'],
];

function firstMatch(
  userAgent: string,
  table: readonly (readonly [string, string])[],
): string | null {
  const found = table.find(([needle]) => userAgent.includes(needle));
  return found === undefined ? null : found[1];
}

function defaultDeviceName(userAgent: string): string {
  const browser = firstMatch(userAgent, BROWSERS);
  const platform = firstMatch(userAgent, PLATFORMS);
  if (browser !== null && platform !== null) return `${browser} on ${platform}`;
  return browser ?? platform ?? FALLBACK_NAME;
}

export { FALLBACK_NAME, defaultDeviceName };
