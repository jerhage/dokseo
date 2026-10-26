import { CorruptRow } from '$lib/shared/corrupt-row';

type UnreadableData = { readonly kind: 'unreadable'; readonly reason: string };

function unreadableData(cause: unknown): UnreadableData {
  if (!(cause instanceof CorruptRow)) throw cause;
  return { kind: 'unreadable', reason: cause.message };
}

export { unreadableData };
export type { UnreadableData };
