import { describe, expect, it } from 'vitest';
import { dockState, pinLift, reportedScreen, toastClearance } from './reader-frame-rules';

describe('reportedScreen', () => {
  it('reports no screen until both widths are measured, then narrow under the breakpoint and wide over it', () => {
    expect(reportedScreen(0, 0)).toBeNull();
    expect(reportedScreen(390, 0)).toBeNull();
    expect(reportedScreen(1440, 640)).toBe('wide');
    expect(reportedScreen(390, 640)).toBe('narrow');
  });
});

describe('dockState', () => {
  it('opens the dock beside a wide page and peeks it under a narrow one', () => {
    expect(dockState(false, null)).toEqual({ placement: 'side', open: true });
    expect(dockState(true, null)).toEqual({ placement: 'peek', open: false });
  });
});

describe('toastClearance', () => {
  it('clears toasts of what sits under the page, and of the bottom bar only while it shows', () => {
    const heights = { bodyHeight: 900, pageHeight: 860, bottomHeight: 48, sheetCover: 0 };

    expect(toastClearance(false, heights)).toBe(40);
    expect(toastClearance(true, heights)).toBe(88);
  });

  it('lifts the pins and clears toasts of the sheet that covers the page', () => {
    const heights = { bodyHeight: 664, pageHeight: 631, bottomHeight: 49, sheetCover: 298 };

    expect(pinLift(false, heights)).toBe(298);
    expect(pinLift(true, heights)).toBe(347);
    expect(toastClearance(false, heights)).toBe(331);
    expect(toastClearance(true, heights)).toBe(380);
  });
});
