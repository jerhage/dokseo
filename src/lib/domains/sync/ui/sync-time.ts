type TimeFormat = {
  readonly locale?: string | undefined;
  readonly timeZone?: string | undefined;
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const NOT_SYNCED_TEXT = 'Not synced yet';

const NEVER_SEEN_TEXT = 'Never seen';

function relativeText(at: number, now: number, format: TimeFormat): string {
  const elapsed = now - at;
  const words = new Intl.RelativeTimeFormat(format.locale, { numeric: 'auto' });
  if (elapsed < MINUTE) return 'just now';
  if (elapsed < HOUR) return words.format(-Math.floor(elapsed / MINUTE), 'minute');
  if (elapsed < DAY) return words.format(-Math.floor(elapsed / HOUR), 'hour');
  return words.format(-Math.floor(elapsed / DAY), 'day');
}

function absoluteText(at: number, format: TimeFormat): string {
  return new Intl.DateTimeFormat(format.locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: format.timeZone,
  }).format(at);
}

function dayText(at: number, format: TimeFormat): string {
  return new Intl.DateTimeFormat(format.locale, {
    dateStyle: 'medium',
    timeZone: format.timeZone,
  }).format(at);
}

function lastSyncText(lastSyncAt: number | null, now: number, format: TimeFormat = {}): string {
  if (lastSyncAt === null) return NOT_SYNCED_TEXT;
  return `${relativeText(lastSyncAt, now, format)} (${absoluteText(lastSyncAt, format)})`;
}

function deviceFacts(
  device: { readonly createdAt: number; readonly lastSeenAt: number | null },
  now: number,
  format: TimeFormat = {},
): string {
  const added = `Added ${dayText(device.createdAt, format)}`;
  const seen =
    device.lastSeenAt === null
      ? NEVER_SEEN_TEXT
      : `Last seen ${relativeText(device.lastSeenAt, now, format)}`;
  return `${added}. ${seen}.`;
}

export { NEVER_SEEN_TEXT, NOT_SYNCED_TEXT, deviceFacts, lastSyncText };
export type { TimeFormat };
