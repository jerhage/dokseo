import { describe, expect, it } from 'vitest';
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
});
