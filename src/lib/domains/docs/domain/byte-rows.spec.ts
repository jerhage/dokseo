import { describe, expect, it } from 'vitest';
import { byteRows, escapeXmlText } from './byte-rows';

describe('byteRows', () => {
  it('splits bytes into rows of hex and printable text', () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x6d, 0x69]);

    expect(byteRows(bytes, 6, 4)).toEqual([
      { offset: 0, hex: '50 4b 03 04', text: 'PK..' },
      { offset: 4, hex: '6d 69', text: 'mi' },
    ]);
  });

  it('shows no more than the bytes asked for', () => {
    expect(byteRows(new Uint8Array(40), 8, 16)).toHaveLength(1);
    expect(byteRows(new Uint8Array(4), -1, 16)).toEqual([]);
  });
});

describe('escapeXmlText', () => {
  it('escapes the characters that would end XML text', () => {
    expect(escapeXmlText('a < b & c > d')).toBe('a &lt; b &amp; c &gt; d');
  });
});
