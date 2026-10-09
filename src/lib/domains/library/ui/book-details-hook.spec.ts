import { describe, expect, it } from 'vitest';
import { bookId } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import { createBookDetails } from './book-details.svelte';

function sourced() {
  let shown: BookId | null = null;
  const told: string[] = [];
  const details = createBookDetails({
    shown: () => shown,
    opened: (id) => {
      shown = id;
      told.push(`opened ${id}`);
    },
    closed: () => {
      shown = null;
      told.push('closed');
    },
  });
  return {
    details,
    told,
    show: (id: BookId | null) => {
      shown = id;
    },
  };
}

function focusProbe() {
  const calls: (FocusOptions | undefined)[] = [];
  const target = {
    isConnected: true,
    focus: (options?: FocusOptions) => void calls.push(options),
  };
  return { calls, target };
}

describe('createBookDetails', () => {
  const one = bookId('one');
  const two = bookId('two');

  it('closes on request', () => {
    const { details } = sourced();
    details.open(one);
    details.close();

    expect(details.openId).toBeNull();
  });

  it('returns focus to the card that opened the details once they close', () => {
    const { calls, target } = focusProbe();
    const { details } = sourced();
    details.open(one, { target, pointer: true });
    details.close();
    details.close();

    expect(calls).toEqual([{ focusVisible: false }]);
  });

  it('tells its source about a reader opening and closing', () => {
    const { details, told } = sourced();
    details.open(one);
    details.close();

    expect(told).toEqual(['opened one', 'closed']);
  });

  it('returns focus without telling its source when the history closed the details', () => {
    const { calls, target } = focusProbe();
    const { details, told, show } = sourced();
    details.open(one, { target, pointer: false });
    show(null);
    details.hide();

    expect(calls).toHaveLength(1);
    expect(told).toEqual(['opened one']);
  });

  it('reads the open book from its source', () => {
    const { details, show } = sourced();
    show(two);

    expect(details.openId).toBe(two);
  });
});
