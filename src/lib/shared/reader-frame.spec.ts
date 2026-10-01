import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReaderFrameView } from './reader-frame.svelte';

const NOTHING_FOCUSED = (): readonly (Element | null)[] => [];

function measured(bodyWidth: number, compactWidth: number): ReaderFrameView {
  const frame = new ReaderFrameView(NOTHING_FOCUSED);
  frame.bodyWidth = bodyWidth;
  frame.compactWidth = compactWidth;
  return frame;
}

describe('ReaderFrameView', () => {
  it('reports a wide frame until both widths are measured and the body is under the breakpoint', () => {
    expect(measured(0, 0).narrow).toBe(false);
    expect(measured(390, 0).narrow).toBe(false);
    expect(measured(1440, 640).narrow).toBe(false);
    expect(measured(390, 640).narrow).toBe(true);
  });

  it('opens the dock beside a wide page and peeks it under a narrow one', () => {
    expect(measured(1440, 640).placement).toBe('side');
    expect(measured(390, 640).placement).toBe('peek');
  });

  it('flips the dock each time it is toggled', () => {
    const wide = measured(1440, 640);
    wide.togglePanel();
    expect(wide.placement).toBe('rail');
    wide.togglePanel();
    expect(wide.placement).toBe('side');

    const narrow = measured(390, 640);
    narrow.togglePanel();
    expect(narrow.placement).toBe('sheet');
  });

  it('reopens a closed dock after a capture on a wide page and leaves a narrow one as it was', () => {
    const wide = measured(1440, 640);
    wide.togglePanel();
    wide.panelAfterCapture();
    expect(wide.placement).toBe('side');

    const narrow = measured(390, 640);
    narrow.panelAfterCapture();
    expect(narrow.placement).toBe('peek');
  });

  it('reports the panel shown beside a wide page and hidden under a narrow one until toggled', () => {
    const wide = measured(1440, 640);
    const narrow = measured(390, 640);
    const hidden = [wide.panelOpen, narrow.panelOpen];
    wide.togglePanel();
    narrow.togglePanel();

    expect([...hidden, wide.panelOpen, narrow.panelOpen]).toEqual([true, false, false, true]);
  });

  it('reports the panel still hidden after a capture under a narrow page', () => {
    const narrow = measured(390, 640);
    narrow.panelAfterCapture();

    expect(narrow.panelOpen).toBe(false);
  });

  it('clears toasts of what sits under the page, and of the bottom bar only while it shows', () => {
    const frame = measured(1440, 640);
    frame.bodyHeight = 900;
    frame.pageHeight = 860;
    frame.bottomHeight = 48;

    expect(frame.toastClearance(false)).toBe(40);
    expect(frame.toastClearance(true)).toBe(88);
  });

  it('lifts the pins and clears toasts of the sheet that covers the page', () => {
    const frame = measured(390, 640);
    frame.bodyHeight = 664;
    frame.pageHeight = 631;
    frame.bottomHeight = 49;
    frame.sheetCover = 298;

    expect(frame.pinLift(false)).toBe(298);
    expect(frame.pinLift(true)).toBe(347);
    expect(frame.toastClearance(false)).toBe(331);
    expect(frame.toastClearance(true)).toBe(380);
  });

  describe('bars', () => {
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

    function barHolding(...nodes: unknown[]): HTMLElement {
      return {
        inert: false,
        contains: (node: unknown) => nodes.includes(node),
      } as unknown as HTMLElement;
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

    it('hides the bars until they are asked for', () => {
      expect(new ReaderFrameView(NOTHING_FOCUSED).barsShown).toBe(false);
    });

    it('shows the bars on a toggle and hides them on the next', () => {
      const frame = new ReaderFrameView(NOTHING_FOCUSED);
      frame.toggleBars(null, null);
      const shown = frame.barsShown;
      frame.toggleBars(null, null);

      expect([shown, frame.barsShown]).toEqual([true, false]);
    });

    it('shows the bars while something else holds them, and a toggle then asks for nothing', () => {
      let open = true;
      const frame = new ReaderFrameView(NOTHING_FOCUSED, () => open);
      const held = frame.barsShown;
      frame.toggleBars(null, null);
      const toggled = frame.barsShown;
      open = false;

      expect([held, toggled, frame.barsShown]).toEqual([true, true, false]);
    });

    it('shows the bars while focus sits in one of them', async () => {
      const button = new FakeElement();
      const frame = new ReaderFrameView(() => [asElement(button)]);
      frame.topBar = barHolding(button);
      frame.focus.refresh();
      await Promise.resolve();

      expect(frame.barsShown).toBe(true);
    });

    it('returns focus from a bar to the page when the bars hide', () => {
      const button = new FakeElement();
      const page = surface();
      const frame = new ReaderFrameView(NOTHING_FOCUSED);
      frame.topBar = barHolding(button);
      frame.toggleBars(null, page);
      frame.toggleBars(asElement(button), page);

      expect([button.blurred, page.focused]).toEqual([1, 1]);
    });

    it('leaves focus where it is when the bars show', () => {
      const button = new FakeElement();
      const page = surface();
      const frame = new ReaderFrameView(NOTHING_FOCUSED);
      frame.topBar = barHolding(button);
      frame.toggleBars(asElement(button), page);

      expect([button.blurred, page.focused, frame.barsShown]).toEqual([0, 0, true]);
    });
  });
});
