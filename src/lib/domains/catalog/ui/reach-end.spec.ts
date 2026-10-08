import { afterEach, describe, expect, it, vi } from 'vitest';
import { NEAR_END_MARGIN, reachEnd } from './reach-end';

type Observed = {
  readonly options: IntersectionObserverInit | undefined;
  readonly callback: IntersectionObserverCallback;
  disconnected: boolean;
};

function stubObserver(): Observed[] {
  const created: Observed[] = [];
  class FakeObserver {
    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      created.push({ options, callback, disconnected: false });
    }
    observe(): void {}
    disconnect(): void {
      const last = created.at(-1);
      if (last) last.disconnected = true;
    }
  }
  vi.stubGlobal('IntersectionObserver', FakeObserver);
  return created;
}

function intersecting(isIntersecting: boolean): IntersectionObserverEntry[] {
  return [{ isIntersecting } as IntersectionObserverEntry];
}

function elementWithin(overflowY: string): HTMLElement {
  const parent = { style: { overflowY }, parentElement: null };
  vi.stubGlobal('getComputedStyle', (node: { style: { overflowY: string } }) => node.style);
  return { parentElement: parent } as unknown as HTMLElement;
}

describe('reachEnd', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports when the element comes near the end of its scroll area', () => {
    const created = stubObserver();
    const onreach = vi.fn();
    reachEnd(onreach)(elementWithin('auto'));
    created[0]?.callback(intersecting(true), {} as IntersectionObserver);
    expect(onreach).toHaveBeenCalledTimes(1);
  });

  it('stays quiet while the element is far from the end', () => {
    const created = stubObserver();
    const onreach = vi.fn();
    reachEnd(onreach)(elementWithin('auto'));
    created[0]?.callback(intersecting(false), {} as IntersectionObserver);
    expect(onreach).not.toHaveBeenCalled();
  });

  it('observes the nearest scrolling ancestor with the margin', () => {
    const created = stubObserver();
    const element = elementWithin('scroll');
    reachEnd(() => undefined)(element);
    expect(created[0]?.options?.root).toBe(element.parentElement);
    expect(created[0]?.options?.rootMargin).toBe(NEAR_END_MARGIN);
  });

  it('disconnects when the attachment is torn down', () => {
    const created = stubObserver();
    const teardown = reachEnd(() => undefined)(elementWithin('auto'));
    if (typeof teardown === 'function') teardown();
    expect(created[0]?.disconnected).toBe(true);
  });
});
