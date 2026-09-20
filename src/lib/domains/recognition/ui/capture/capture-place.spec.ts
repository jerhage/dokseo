import { describe, expect, it } from 'vitest';
import { capturedLabel } from './capture-place';

const NOW = 1_700_000_000_000;

describe('capturedLabel', () => {
  it('says nothing for a capture stored before a time was kept', () => {
    expect(capturedLabel(0, NOW)).toBeNull();
  });

  it('reports the last minute as just now', () => {
    expect(capturedLabel(NOW - 30_000, NOW)).toBe('captured just now');
  });

  it('reports minutes within the hour', () => {
    expect(capturedLabel(NOW - 5 * 60_000, NOW)).toBe('captured 5 min ago');
  });

  it('keeps the hour singular at one hour', () => {
    expect(capturedLabel(NOW - 3_600_000, NOW)).toBe('captured 1 hour ago');
  });

  it('reports days beyond the first', () => {
    expect(capturedLabel(NOW - 2 * 86_400_000, NOW)).toBe('captured 2 days ago');
  });

  it('never reports a time ahead of now', () => {
    expect(capturedLabel(NOW + 86_400_000, NOW)).toBe('captured just now');
  });
});
