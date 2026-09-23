import { describe, expect, it } from 'vitest';
import { ChromeFocus } from './chrome-focus.svelte';
import type { ChromeBar } from './reader-chrome';

const PILL = {} as Element;

const ELSEWHERE = {} as Element;

function bar(held: readonly Element[]): ChromeBar {
  return { inert: false, contains: (node: Element) => held.includes(node) };
}

class Harness {
  readonly focus: ChromeFocus;

  #queued: (() => void)[] = [];
  #bars: readonly (ChromeBar | null)[] = [bar([PILL])];
  #node: Element | null = null;
  #reads = 0;

  constructor() {
    this.focus = new ChromeFocus(
      () => this.#bars,
      () => {
        this.#reads += 1;
        return [this.#node];
      },
      (read) => this.#queued.push(read),
    );
  }

  get reads(): number {
    return this.#reads;
  }

  looking(node: Element | null): void {
    this.#node = node;
  }

  showing(bars: readonly (ChromeBar | null)[]): void {
    this.#bars = bars;
  }

  settle(): void {
    const due = this.#queued.splice(0, this.#queued.length);
    for (const read of due) read();
  }
}

describe('ChromeFocus', () => {
  it('reports nothing held before anything asks it to look', () => {
    const held = new Harness();

    expect(held.focus.held).toBe(false);
  });

  it('reads no focus while the turn that asked is still running', () => {
    const held = new Harness();
    held.looking(PILL);

    held.focus.refresh();

    expect(held.reads).toBe(0);
  });

  it('leaves the bars alone until the deferred turn runs', () => {
    const held = new Harness();
    held.looking(PILL);

    held.focus.refresh();

    expect(held.focus.held).toBe(false);
  });

  it('holds the bars up once the deferred turn finds focus inside one', () => {
    const held = new Harness();
    held.looking(PILL);

    held.focus.refresh();
    held.settle();

    expect(held.focus.held).toBe(true);
  });

  it('lets the bars fall once the deferred turn finds focus outside every one', () => {
    const held = new Harness();
    held.looking(PILL);
    held.focus.refresh();
    held.settle();

    held.looking(ELSEWHERE);
    held.focus.refresh();
    held.settle();

    expect(held.focus.held).toBe(false);
  });

  it('reads focus once for several asks inside one turn', () => {
    const held = new Harness();
    held.looking(PILL);

    held.focus.refresh();
    held.focus.refresh();
    held.focus.refresh();
    held.settle();

    expect(held.reads).toBe(1);
  });

  it('reads again for an ask that arrives after the deferred turn ran', () => {
    const held = new Harness();
    held.focus.refresh();
    held.settle();

    held.looking(PILL);
    held.focus.refresh();
    held.settle();

    expect(held.reads).toBe(2);
  });

  it('waits for a microtask when nothing else says when to look', async () => {
    const focus = new ChromeFocus(
      () => [bar([PILL])],
      () => [PILL],
    );

    focus.refresh();
    await Promise.resolve();

    expect(focus.held).toBe(true);
  });

  it('answers for its own bars alone, so two readers never share one answer', () => {
    const one = new Harness();
    const other = new Harness();
    one.looking(PILL);
    other.looking(ELSEWHERE);

    one.focus.refresh();
    other.focus.refresh();
    one.settle();
    other.settle();

    expect([one.focus.held, other.focus.held]).toStrictEqual([true, false]);
  });

  it('answers with the bars standing when the turn runs, not the ones standing when it was asked', () => {
    const held = new Harness();
    held.looking(PILL);
    held.showing([null]);

    held.focus.refresh();
    held.showing([bar([PILL])]);
    held.settle();

    expect(held.focus.held).toBe(true);
  });
});
