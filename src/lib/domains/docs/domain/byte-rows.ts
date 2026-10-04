type ByteRow = {
  readonly offset: number;
  readonly hex: string;
  readonly text: string;
};

const PRINTABLE_FIRST = 0x20;

const PRINTABLE_LAST = 0x7e;

function shownCharacter(byte: number): string {
  return byte >= PRINTABLE_FIRST && byte <= PRINTABLE_LAST ? String.fromCharCode(byte) : '.';
}

function byteRows(bytes: Uint8Array, count: number, width: number): readonly ByteRow[] {
  const shown = bytes.slice(0, Math.max(0, count));
  const rows: ByteRow[] = [];
  for (let offset = 0; offset < shown.length; offset += width) {
    const row = Array.from(shown.subarray(offset, offset + width));
    rows.push({
      offset,
      hex: row.map((byte) => byte.toString(16).padStart(2, '0')).join(' '),
      text: row.map(shownCharacter).join(''),
    });
  }
  return rows;
}

function escapeXmlText(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export { byteRows, escapeXmlText };
export type { ByteRow };
