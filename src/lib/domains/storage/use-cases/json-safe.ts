type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [field: string]: JsonValue };

function bytesOf(buffer: ArrayBufferLike, offset: number, length: number): readonly number[] {
  return Array.from(new Uint8Array(buffer, offset, length));
}

function safeObject(value: object, inside: ReadonlySet<object>): JsonValue {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (ArrayBuffer.isView(value)) return bytesOf(value.buffer, value.byteOffset, value.byteLength);
  if (value instanceof ArrayBuffer) return bytesOf(value, 0, value.byteLength);
  if (value instanceof Map) {
    return [...value].map(([key, item]) => [listed(key, inside), listed(item, inside)]);
  }
  if (value instanceof Set) return [...value].map((item) => listed(item, inside));
  if (Array.isArray(value)) return value.map((item) => listed(item, inside));
  const fields: Record<string, JsonValue> = {};
  for (const [field, item] of Object.entries(value)) {
    const safe = safeValue(item, inside);
    if (safe !== undefined) fields[field] = safe;
  }
  return fields;
}

function safeValue(value: unknown, ancestors: ReadonlySet<object>): JsonValue | undefined {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value !== 'object') return undefined;
  if (ancestors.has(value)) return null;
  return safeObject(value, new Set(ancestors).add(value));
}

function listed(value: unknown, inside: ReadonlySet<object>): JsonValue {
  return safeValue(value, inside) ?? null;
}

function jsonSafe(value: unknown): JsonValue {
  return listed(value, new Set());
}

export { jsonSafe };
export type { JsonValue };
