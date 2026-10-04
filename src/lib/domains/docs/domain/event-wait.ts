import { match } from 'ts-pattern';

type WaitStrategy = 'forever' | 'race' | 'race-and-clean-up';

type WaitEnd = { readonly kind: 'arrived' } | { readonly kind: 'timed-out' };

type WaitHoldings = {
  readonly listeners: number;
  readonly timers: number;
};

type HoldingsWatcher = (holdings: WaitHoldings) => void;

const ARRIVED: WaitEnd = { kind: 'arrived' };

const TIMED_OUT: WaitEnd = { kind: 'timed-out' };

class WaitLedger {
  #listeners = 0;
  #timers = 0;
  #watch: HoldingsWatcher;

  constructor(watch: HoldingsWatcher) {
    this.#watch = watch;
  }

  get holdings(): WaitHoldings {
    return { listeners: this.#listeners, timers: this.#timers };
  }

  listen(target: EventTarget, type: string, onEvent: () => void): () => void {
    let attached = true;
    const heard = () => {
      stop();
      onEvent();
    };
    const stop = () => {
      if (!attached) return;
      attached = false;
      target.removeEventListener(type, heard);
      this.#changeListeners(-1);
    };
    target.addEventListener(type, heard);
    this.#changeListeners(1);
    return stop;
  }

  wait(ms: number, onTimeout: () => void): () => void {
    let pending = true;
    const timer = setTimeout(() => {
      stop();
      onTimeout();
    }, ms);
    const stop = () => {
      if (!pending) return;
      pending = false;
      clearTimeout(timer);
      this.#changeTimers(-1);
    };
    this.#changeTimers(1);
    return stop;
  }

  #changeListeners(by: number): void {
    this.#listeners += by;
    this.#watch(this.holdings);
  }

  #changeTimers(by: number): void {
    this.#timers += by;
    this.#watch(this.holdings);
  }
}

function eventArrival(ledger: WaitLedger, target: EventTarget, type: string) {
  let stop: () => void = () => undefined;
  const arrived = new Promise<WaitEnd>((resolve) => {
    stop = ledger.listen(target, type, () => resolve(ARRIVED));
  });
  return { arrived, stop };
}

function deadline(ledger: WaitLedger, ms: number) {
  let stop: () => void = () => undefined;
  const expired = new Promise<WaitEnd>((resolve) => {
    stop = ledger.wait(ms, () => resolve(TIMED_OUT));
  });
  return { expired, stop };
}

async function waitForEvent(
  ledger: WaitLedger,
  target: EventTarget,
  type: string,
  ms: number,
  strategy: WaitStrategy,
): Promise<WaitEnd> {
  const event = eventArrival(ledger, target, type);
  return match(strategy)
    .with('forever', () => event.arrived)
    .with('race', () => Promise.race([event.arrived, deadline(ledger, ms).expired]))
    .with('race-and-clean-up', async () => {
      const timeout = deadline(ledger, ms);
      try {
        return await Promise.race([event.arrived, timeout.expired]);
      } finally {
        event.stop();
        timeout.stop();
      }
    })
    .exhaustive();
}

export { WaitLedger, waitForEvent };
export type { HoldingsWatcher, WaitEnd, WaitHoldings, WaitStrategy };
