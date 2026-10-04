import { describe, expect, it } from 'vitest';
import { captureText, fieldKey, keyText, valueRows } from './indexeddb-format';

describe('fieldKey', () => {
  it('reads one field as a key and several as an array key', () => {
    const value = { id: 3, bookId: 'b2', createdAt: 1002 };

    expect(fieldKey('bookId')(value)).toBe("'b2'");
    expect(fieldKey('bookId', 'createdAt')(value)).toBe("['b2', 1002]");
  });
});

describe('keyText', () => {
  it('writes strings quoted, numbers bare and arrays element by element', () => {
    expect(keyText('b2')).toBe("'b2'");
    expect(keyText(1005)).toBe('1005');
    expect(keyText(['b2', 1005])).toBe("['b2', 1005]");
    expect(keyText(new Date(0))).toBe('Date(1970-01-01T00:00:00.000Z)');
  });
});

describe('captureText', () => {
  it('names a missing tagIds field instead of printing undefined', () => {
    expect(captureText({ id: 4, bookId: 'b3', page: 30, createdAt: 1009 })).toBe(
      "bookId 'b3' · page 30 · createdAt 1009 · no tagIds",
    );
  });

  it('prints the tags of a tagged capture', () => {
    expect(captureText({ bookId: 'b2', page: 4, createdAt: 1002, tagIds: ['vocab'] })).toContain(
      "tagIds ['vocab']",
    );
  });
});

describe('valueRows', () => {
  it('numbers the rows in the order the request returned them and keys them by id', () => {
    const rows = valueRows([
      { id: 7, bookId: 'b1', page: 5, createdAt: 1003 },
      { id: 2, bookId: 'b1', page: 3, createdAt: 1001 },
    ]);

    expect(rows.map((row) => [row.step, row.primaryKey])).toEqual([
      [1, '7'],
      [2, '2'],
    ]);
  });
});
