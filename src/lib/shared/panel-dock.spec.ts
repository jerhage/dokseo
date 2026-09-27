import { describe, expect, it } from 'vitest';
import { askedAfterCapture, isNarrow } from './panel-dock';

describe('isNarrow', () => {
  it('calls a body narrower than the compact breakpoint narrow', () => {
    expect(isNarrow(390, 700)).toBe(true);
  });

  it('calls a body at or past the breakpoint wide', () => {
    expect(isNarrow(700, 700)).toBe(false);
    expect(isNarrow(1440, 700)).toBe(false);
  });

  it('calls nothing narrow before either width is measured', () => {
    expect(isNarrow(0, 700)).toBe(false);
    expect(isNarrow(390, 0)).toBe(false);
  });
});

describe('askedAfterCapture', () => {
  it('opens the panel on a wide screen after a capture', () => {
    expect(askedAfterCapture(false, null)).toBe(true);
    expect(askedAfterCapture(false, false)).toBe(true);
  });

  it('leaves the sheet as the reader left it on a narrow screen', () => {
    expect(askedAfterCapture(true, null)).toBeNull();
    expect(askedAfterCapture(true, false)).toBe(false);
    expect(askedAfterCapture(true, true)).toBe(true);
  });
});
