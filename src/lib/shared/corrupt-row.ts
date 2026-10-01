class CorruptRow extends Error {
  override readonly name = 'CorruptRow';

  constructor(row: string, field: string, value: unknown) {
    super(`A stored ${row} holds an unknown ${field}: ${String(value)}`);
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

export { CorruptRow, knownStoredValue };
