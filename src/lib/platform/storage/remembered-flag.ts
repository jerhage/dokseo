export type RememberedFlag = {
  readonly value: () => boolean;
  readonly set: (value: boolean) => boolean;
};

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function read(held: Storage | null, key: string, fallback: boolean): boolean {
  if (held === null) return fallback;

  try {
    const raw = held.getItem(key);
    if (raw === null) return fallback;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'boolean') return fallback;

    return parsed;
  } catch {
    return fallback;
  }
}

function write(held: Storage | null, key: string, value: boolean): void {
  if (held === null) return;

  try {
    held.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

export function rememberedFlag(
  key: string,
  fallback: boolean,
  held: Storage | null = store(),
): RememberedFlag {
  let value = read(held, key, fallback);

  return {
    value: () => value,
    set: (next) => {
      if (next === value) return value;

      value = next;
      write(held, key, value);
      return value;
    },
  };
}
