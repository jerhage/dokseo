import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChromeBar } from './reader-chrome';
import { createBarsToggle, createPanelDock } from './reader-frame.svelte';
import { dockState } from './reader-frame-rules';

const NOTHING_FOCUSED = (): readonly (Element | null)[] => [];

describe('createPanelDock', () => {
  it('flips the dock each time it is toggled', () => {
    const wide = createPanelDock();
    wide.toggle(false);
    expect(dockState(false, wide.asked).placement).toBe('rail');
    wide.toggle(false);
    expect(dockState(false, wide.asked).placement).toBe('side');

    const narrow = createPanelDock();
    narrow.toggle(true);
    expect(dockState(true, narrow.asked).placement).toBe('sheet');
  });

  it('reopens a closed dock after a capture on a wide page and leaves a narrow one as it was', () => {
    const wide = createPanelDock();
    wide.toggle(false);
    wide.afterCapture(false);
    expect(dockState(false, wide.asked).placement).toBe('side');

    const narrow = createPanelDock();
    narrow.afterCapture(true);
    expect(dockState(true, narrow.asked)).toEqual({ placement: 'peek', open: false });
  });

  it('reports the panel shown beside a wide page and hidden under a narrow one until toggled', () => {
    const wide = createPanelDock();
    const narrow = createPanelDock();
    const hidden = [dockState(false, wide.asked).open, dockState(true, narrow.asked).open];
    wide.toggle(false);
    narrow.toggle(true);

    expect([
      ...hidden,
      dockState(false, wide.asked).open,
      dockState(true, narrow.asked).open,
    ]).toEqual([true, false, false, true]);
  });
});

describe('createBarsToggle', () => {
  class FakeElement {
    blurred = 0;
    blur(): void {
      this.blurred += 1;
    }
  }

  type Surface = { focused: number; focus: () => void };

  function surface(): Surface {
    const held = { focused: 0, focus: () => (held.focused += 1) };
    return held;
  }

  function barHolding(...nodes: unknown[]): ChromeBar {
    return { inert: false, contains: (node: unknown) => nodes.includes(node) };
  }

  function asElement(node: FakeElement): Element {
    return node as unknown as Element;
  }

  beforeEach(() => {
    vi.stubGlobal('HTMLElement', FakeElement);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('hides the bars until a toggle shows them, and hides them on the next', () => {
    const bars = createBarsToggle(() => [], NOTHING_FOCUSED);
    const before = bars.shown;
    bars.toggle(null, null);
    const shown = bars.shown;
    bars.toggle(null, null);

    expect([before, shown, bars.shown]).toEqual([false, true, false]);
  });

  it('shows the bars while something else holds them, and a toggle then asks for nothing', () => {
    let open = true;
    const bars = createBarsToggle(
      () => [],
      NOTHING_FOCUSED,
      () => open,
    );
    const held = bars.shown;
    bars.toggle(null, null);
    const toggled = bars.shown;
    open = false;

    expect([held, toggled, bars.shown]).toEqual([true, true, false]);
  });

  it('shows the bars while focus sits in one of them', async () => {
    const button = new FakeElement();
    const bars = createBarsToggle(
      () => [barHolding(button)],
      () => [asElement(button)],
    );
    bars.refresh();
    await Promise.resolve();

    expect(bars.shown).toBe(true);
  });

  it('returns focus from a bar to the page when the bars hide', () => {
    const button = new FakeElement();
    const page = surface();
    const bars = createBarsToggle(() => [barHolding(button)], NOTHING_FOCUSED);
    bars.toggle(null, page);
    bars.toggle(asElement(button), page);

    expect([button.blurred, page.focused]).toEqual([1, 1]);
  });

  it('leaves focus where it is when the bars show', () => {
    const button = new FakeElement();
    const page = surface();
    const bars = createBarsToggle(() => [barHolding(button)], NOTHING_FOCUSED);
    bars.toggle(asElement(button), page);

    expect([button.blurred, page.focused, bars.shown]).toEqual([0, 0, true]);
  });
});
