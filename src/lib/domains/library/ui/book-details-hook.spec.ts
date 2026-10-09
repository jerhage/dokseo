import { describe, expect, it } from 'vitest';
import { bookId } from '$lib/shared/ids';
import { createBookDetails } from './book-details.svelte';

describe('createBookDetails', () => {
  const one = bookId('one');
  const two = bookId('two');

  it('closes on request', () => {
    const details = createBookDetails();
    details.open(one);
    details.close();

    expect(details.openId).toBeNull();
  });

  it('returns focus to the card that opened the details once they close', () => {
    const calls: (FocusOptions | undefined)[] = [];
    const target = {
      isConnected: true,
      focus: (options?: FocusOptions) => void calls.push(options),
    };
    const details = createBookDetails();
    details.open(one, { target, pointer: true });
    details.close();
    details.close();

    expect(calls).toEqual([{ focusVisible: false }]);
  });

  it('tells its hooks about a user opening and closing, but not about a restore', () => {
    const told: string[] = [];
    const details = createBookDetails({
      opened: (id) => told.push(`opened ${id}`),
      closed: () => told.push('closed'),
    });
    details.open(one);
    details.close();
    details.show(two);
    details.hide();

    expect(told).toEqual(['opened one', 'closed']);
    expect(details.openId).toBeNull();
  });

  it('shows the book a restore names', () => {
    const details = createBookDetails();
    details.show(two);

    expect(details.openId).toBe(two);
  });
});
