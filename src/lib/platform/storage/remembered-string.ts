type StringStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type LocateStore = () => StringStore | null;

type RememberedString = {
  readonly read: () => string | null;
  readonly write: (value: string) => void;
  readonly forget: () => void;
};

function localStore(): StringStore | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

function rememberedString(key: string, locate: LocateStore = localStore): RememberedString {
  return {
    read: () => {
      try {
        return locate()?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    write: (value) => {
      try {
        locate()?.setItem(key, value);
      } catch {
        return;
      }
    },
    forget: () => {
      try {
        locate()?.removeItem(key);
      } catch {
        return;
      }
    },
  };
}

export { rememberedString };
export type { LocateStore, RememberedString, StringStore };
