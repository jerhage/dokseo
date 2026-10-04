type LedgerOutcome<T> =
  | { readonly kind: 'answered'; readonly id: number; readonly value: T }
  | { readonly kind: 'refused'; readonly id: number; readonly message: string }
  | { readonly kind: 'abandoned'; readonly id: number; readonly cause: string };

type OpenedRequest<T> = {
  readonly id: number;
  readonly outcome: Promise<LedgerOutcome<T>>;
};

class RequestLedger<T> {
  #pending = new Map<number, (outcome: LedgerOutcome<T>) => void>();
  #lastId = 0;

  get waiting(): readonly number[] {
    return [...this.#pending.keys()];
  }

  open(): OpenedRequest<T> {
    this.#lastId += 1;
    const id = this.#lastId;
    const outcome = new Promise<LedgerOutcome<T>>((resolve) => {
      this.#pending.set(id, resolve);
    });
    return { id, outcome };
  }

  answer(id: number, value: T): boolean {
    return this.#settle({ kind: 'answered', id, value });
  }

  refuse(id: number, message: string): boolean {
    return this.#settle({ kind: 'refused', id, message });
  }

  abandonAll(cause: string): number {
    const ids = this.waiting;
    for (const id of ids) this.#settle({ kind: 'abandoned', id, cause });
    return ids.length;
  }

  #settle(outcome: LedgerOutcome<T>): boolean {
    const resolve = this.#pending.get(outcome.id);
    if (resolve === undefined) return false;
    this.#pending.delete(outcome.id);
    resolve(outcome);
    return true;
  }
}

export { RequestLedger };
export type { LedgerOutcome, OpenedRequest };
