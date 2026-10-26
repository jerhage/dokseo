import { describe, expect, it } from 'vitest';
import { NEVER_SEEN_TEXT, NOT_SYNCED_TEXT, deviceFacts, lastSyncText } from './sync-time';

const FORMAT = { locale: 'en-US', timeZone: 'UTC' };
const NOW = Date.UTC(2026, 9, 26, 15, 0);
const HOUR = 3_600_000;

describe('lastSyncText', () => {
  it('says so when nothing has synced', () => {
    expect(lastSyncText(null, NOW, FORMAT)).toBe(NOT_SYNCED_TEXT);
  });

  it('gives the relative and the absolute time', () => {
    expect(lastSyncText(NOW - 2 * HOUR, NOW, FORMAT)).toBe('2 hours ago (Oct 26, 2026, 1:00 PM)');
  });

  it('says just now inside the first minute', () => {
    expect(lastSyncText(NOW - 20_000, NOW, FORMAT)).toMatch(/^just now/u);
  });

  it('counts days beyond a day', () => {
    expect(lastSyncText(NOW - 3 * 24 * HOUR, NOW, FORMAT)).toMatch(/^3 days ago/u);
  });
});

describe('deviceFacts', () => {
  it('gives the day added and the last time seen', () => {
    expect(
      deviceFacts({ createdAt: Date.UTC(2026, 9, 3, 8), lastSeenAt: NOW - HOUR }, NOW, FORMAT),
    ).toBe('Added Oct 3, 2026. Last seen 1 hour ago.');
  });

  it('says a device never seen was never seen', () => {
    expect(deviceFacts({ createdAt: NOW, lastSeenAt: null }, NOW, FORMAT)).toContain(
      NEVER_SEEN_TEXT,
    );
  });
});
