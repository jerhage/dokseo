type Notice<T> = (value: T) => void;

type NoticeBoard<K, T> = {
  readonly watch: (key: K, notice: Notice<T>) => void;
  readonly stop: (key: K, notice: Notice<T>) => void;
  readonly post: (key: K, value: T) => void;
  readonly latest: (key: K) => T | undefined;
  readonly forget: (key: K) => void;
};

function noticeBoard<K, T>(): NoticeBoard<K, T> {
  const watchers = new Map<K, Set<Notice<T>>>();
  const posted = new Map<K, T>();

  function watching(key: K): Set<Notice<T>> {
    const held = watchers.get(key);
    if (held !== undefined) return held;

    const opened = new Set<Notice<T>>();
    watchers.set(key, opened);
    return opened;
  }

  return {
    watch: (key, notice) => {
      watching(key).add(notice);
    },
    stop: (key, notice) => {
      watchers.get(key)?.delete(notice);
    },
    post: (key, value) => {
      posted.set(key, value);
      for (const notice of watching(key)) notice(value);
    },
    latest: (key) => posted.get(key),
    forget: (key) => {
      posted.delete(key);
    },
  };
}

export { noticeBoard };
export type { Notice, NoticeBoard };
