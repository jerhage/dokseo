function describeValue(value: unknown): string {
  const tagOf = (thing: object): string => Object.prototype.toString.call(thing).slice(8, -1);
  const fieldOf = (owner: object, field: unknown): string => {
    if (field === owner) return 'itself';
    if (field === null) return 'null';
    if (typeof field === 'object') return tagOf(field);
    return typeof field;
  };
  if (value === null) return 'null';
  if (typeof value === 'string') return `string ${JSON.stringify(value)}`;
  if (typeof value === 'bigint') return `bigint ${value}n`;
  if (typeof value !== 'object') return `${typeof value} ${String(value)}`;
  if (value instanceof Date) return `Date ${value.toISOString()}`;
  if (value instanceof Map)
    return `Map with ${value.size} ${value.size === 1 ? 'entry' : 'entries'}`;
  if (value instanceof Set)
    return `Set with ${value.size} ${value.size === 1 ? 'value' : 'values'}`;
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (value instanceof ArrayBuffer) return `ArrayBuffer of ${value.byteLength} bytes`;
  if (ArrayBuffer.isView(value)) return `${tagOf(value)} of ${value.byteLength} bytes`;
  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    return `Blob of ${value.size} bytes, type ${JSON.stringify(value.type)}`;
  }
  if (Array.isArray(value)) return `Array of ${value.length} items`;
  const prototype: unknown = Object.getPrototypeOf(value);
  const kind = prototype === Object.prototype ? 'plain object' : tagOf(value);
  const fields = Object.entries(value).map(([key, field]) => `${key}: ${fieldOf(value, field)}`);
  return `${kind} { ${fields.join(', ')} }`;
}

export { describeValue };
