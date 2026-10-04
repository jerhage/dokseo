import { describe, expect, it } from 'vitest';
import { byteCount, elapsed } from './identity-text';

describe('byteCount', () => {
  it.each([
    [0, '0 bytes'],
    [1, '1 byte'],
    [1023, '1,023 bytes'],
    [1024, '1 KiB'],
    [5000, '4.9 KiB'],
    [1048576, '1 MiB'],
    [1500000, '1.4 MiB'],
    [1073741824, '1 GiB'],
  ])('writes %i as %s', (bytes, text) => {
    expect(byteCount(bytes)).toBe(text);
  });
});

describe('elapsed', () => {
  it('keeps one decimal below ten milliseconds', () => {
    expect(elapsed(0.42)).toBe('0.4 ms');
  });

  it('rounds to whole milliseconds from ten up', () => {
    expect(elapsed(1234.6)).toBe('1,235 ms');
  });
});
