export type RememberedSet = {
  readonly values: () => readonly string[];
  readonly add: (value: string) => readonly string[];
};

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function read(key: string): readonly string[] {
  const held = store();
  if (held === null) return [];

  try {
    const raw = held.getItem(key);
    if (raw === null) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((entry) => typeof entry === 'string');
  } catch {
    return [];
  }
}

function write(key: string, values: readonly string[]): void {
  const held = store();
  if (held === null) return;

  try {
    held.setItem(key, JSON.stringify(values));
  } catch {
    return;
  }
}

export function rememberedSet(key: string): RememberedSet {
  let values = read(key);

  return {
    values: () => values,
    add: (value) => {
      if (values.includes(value)) return values;

      values = [...values, value];
      write(key, values);
      return values;
    },
  };
}
