import { describe, expect, it } from 'vitest';
import { RequestLedger } from './request-ledger';

describe('RequestLedger', () => {
  it('numbers each request and settles each by its own id, in any order', async () => {
    const ledger = new RequestLedger<number>();
    const first = ledger.open();
    const second = ledger.open();

    expect([first.id, second.id]).toEqual([1, 2]);
    expect(ledger.answer(2, 4)).toBe(true);
    expect(ledger.waiting).toEqual([1]);
    expect(ledger.refuse(1, 'negative')).toBe(true);

    await expect(second.outcome).resolves.toEqual({ kind: 'answered', id: 2, value: 4 });
    await expect(first.outcome).resolves.toEqual({ kind: 'refused', id: 1, message: 'negative' });
    expect(ledger.waiting).toEqual([]);
  });

  it('ignores a reply for an id that is not waiting', () => {
    const ledger = new RequestLedger<number>();
    const opened = ledger.open();

    expect(ledger.answer(opened.id, 1)).toBe(true);
    expect(ledger.answer(opened.id, 2)).toBe(false);
    expect(ledger.refuse(99, 'unknown')).toBe(false);
  });

  it('abandons every waiting request with one cause and reports how many', async () => {
    const ledger = new RequestLedger<number>();
    const first = ledger.open();
    const second = ledger.open();

    expect(ledger.abandonAll('the worker stopped')).toBe(2);

    await expect(first.outcome).resolves.toEqual({
      kind: 'abandoned',
      id: 1,
      cause: 'the worker stopped',
    });
    await expect(second.outcome).resolves.toMatchObject({ kind: 'abandoned', id: 2 });
    expect(ledger.abandonAll('again')).toBe(0);
  });
});
