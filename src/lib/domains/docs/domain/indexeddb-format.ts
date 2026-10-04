type QueryRow = {
  readonly step: number;
  readonly key: string;
  readonly primaryKey: string;
  readonly value: string | null;
};

type QueryResult =
  | { readonly kind: 'rows'; readonly rows: readonly QueryRow[] }
  | { readonly kind: 'count'; readonly count: number };

function keyText(key: unknown): string {
  if (Array.isArray(key)) return `[${key.map(keyText).join(', ')}]`;
  if (typeof key === 'string') return `'${key}'`;
  if (typeof key === 'number') return String(key);
  if (key instanceof Date) return `Date(${key.toISOString()})`;
  return String(key);
}

function fieldOf(value: object, field: string): unknown {
  return field in value ? Reflect.get(value, field) : undefined;
}

function captureText(value: unknown): string {
  if (typeof value !== 'object' || value === null) return keyText(value);
  const parts = [
    `bookId ${keyText(fieldOf(value, 'bookId'))}`,
    `page ${keyText(fieldOf(value, 'page'))}`,
    `createdAt ${keyText(fieldOf(value, 'createdAt'))}`,
  ];
  const tags = fieldOf(value, 'tagIds');
  parts.push(tags === undefined ? 'no tagIds' : `tagIds ${keyText(tags)}`);
  return parts.join(' · ');
}

function primaryKeyOf(value: unknown): string {
  if (typeof value !== 'object' || value === null) return '?';
  return keyText(fieldOf(value, 'id'));
}

function fieldKey(...fields: readonly string[]): (value: unknown) => string {
  return (value) => {
    if (typeof value !== 'object' || value === null) return '?';
    const keys = fields.map((field) => fieldOf(value, field));
    return keyText(keys.length === 1 ? keys[0] : keys);
  };
}

function valueRows(
  values: readonly unknown[],
  keyOf: (value: unknown) => string = primaryKeyOf,
): readonly QueryRow[] {
  return values.map((value, index) => ({
    step: index + 1,
    key: keyOf(value),
    primaryKey: primaryKeyOf(value),
    value: captureText(value),
  }));
}

export { captureText, fieldKey, keyText, primaryKeyOf, valueRows };
export type { QueryResult, QueryRow };
