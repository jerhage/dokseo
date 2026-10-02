type StoredFields = { readonly [field: string]: unknown };

function corruptRowMessage(row: string, field: string, value: unknown): string {
  if (value === undefined) return `A stored ${row} lacks its ${field}`;
  return `A stored ${row} holds an unknown ${field}: ${String(value)}`;
}

class CorruptRow extends Error {
  override readonly name = 'CorruptRow';

  constructor(row: string, field: string, value: unknown) {
    super(corruptRowMessage(row, field, value));
  }
}

function knownStoredValue<T>(
  row: string,
  field: string,
  value: unknown,
  known: (value: unknown) => value is T,
): T {
  if (known(value)) return value;
  throw new CorruptRow(row, field, value);
}

function isStoredFields(value: unknown): value is StoredFields {
  return typeof value === 'object' && value !== null;
}

function isStoredList(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string';
}

function isTextOrNull(value: unknown): value is string | null {
  return value === null || isText(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || isNumber(value);
}

function isTextList(value: unknown): value is readonly string[] {
  return isStoredList(value) && value.every(isText);
}

export {
  CorruptRow,
  isNumber,
  isNumberOrNull,
  isStoredFields,
  isStoredList,
  isText,
  isTextList,
  isTextOrNull,
  knownStoredValue,
};
export type { StoredFields };
