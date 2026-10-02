import { describe, expect, it } from 'vitest';
import { pointerKinds, shownTurnSettings } from './turn-settings';

describe('pointerKinds', () => {
  it('names each pair of pointer answers', () => {
    expect(pointerKinds(true, false)).toBe('touch');
    expect(pointerKinds(false, true)).toBe('fine');
    expect(pointerKinds(true, true)).toBe('touch-and-fine');
    expect(pointerKinds(false, false)).toBe('neither');
  });
});

describe('shownTurnSettings', () => {
  it('shows the touch setting and hides the edge click toggle on a touch-only device', () => {
    expect(shownTurnSettings(true, false)).toEqual({ touchTurns: true, edgeClicks: false });
  });

  it('shows the edge click toggle and hides the touch setting on a mouse-only device', () => {
    expect(shownTurnSettings(false, true)).toEqual({ touchTurns: false, edgeClicks: true });
  });

  it('shows both on a device with a touch screen and a mouse', () => {
    expect(shownTurnSettings(true, true)).toEqual({ touchTurns: true, edgeClicks: true });
  });

  it('shows neither when the device reports no pointer', () => {
    expect(shownTurnSettings(false, false)).toEqual({ touchTurns: false, edgeClicks: false });
  });
});
