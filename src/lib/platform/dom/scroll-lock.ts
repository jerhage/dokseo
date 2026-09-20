type ScrollLockTarget = { readonly style: { overflow: string } };

type Hold = { previous: string; holders: number };

const holds = new WeakMap<ScrollLockTarget, Hold>();

export function lockScrolling(target: ScrollLockTarget): () => void {
  const hold = holds.get(target) ?? { previous: target.style.overflow, holders: 0 };
  hold.holders += 1;
  holds.set(target, hold);
  target.style.overflow = 'hidden';

  let released = false;
  return () => {
    if (released) return;
    released = true;

    hold.holders -= 1;
    if (hold.holders > 0) return;

    holds.delete(target);
    target.style.overflow = hold.previous;
  };
}
