import { describe, expect, it } from 'vitest';
import { captureId } from '$lib/shared/ids';
import { NO_REVEAL, revealCard, revealFor } from './capture-reveal';

const made = captureId('c2');
const other = captureId('c1');

describe('revealFor', () => {
  it.each([
    ['nothing to reveal', NO_REVEAL],
    ['a capture to reveal the book then forgot', { kind: 'pending', id: made }],
  ] as const)('holds nothing to reveal while no capture was made, from %s', (_case, state) => {
    expect(revealFor(state, null)).toEqual(NO_REVEAL);
  });

  it('marks a capture just made as to reveal', () => {
    expect(revealFor(NO_REVEAL, made)).toEqual({ kind: 'pending', id: made });
  });

  it('keeps a revealed capture revealed while it stays the latest', () => {
    expect(revealFor({ kind: 'done', id: made }, made)).toEqual({ kind: 'done', id: made });
  });

  it('marks the next capture made as to reveal after one was revealed', () => {
    expect(revealFor({ kind: 'done', id: other }, made)).toEqual({ kind: 'pending', id: made });
  });
});

describe('revealCard', () => {
  it('scrolls to the capture just made when the panel shows, and marks it revealed', () => {
    expect(revealCard(NO_REVEAL, made, made, true)).toEqual({
      state: { kind: 'done', id: made },
      scroll: true,
    });
  });

  it('keeps the capture to reveal while the panel is hidden', () => {
    expect(revealCard(NO_REVEAL, made, made, false)).toEqual({
      state: { kind: 'pending', id: made },
      scroll: false,
    });
  });

  it('scrolls to a capture still to reveal once the panel shows', () => {
    const hidden = revealCard(NO_REVEAL, made, made, false);

    expect(revealCard(hidden.state, made, made, true).scroll).toBe(true);
  });

  it('scrolls to no card other than the one to reveal', () => {
    expect(revealCard(NO_REVEAL, other, made, true)).toEqual({
      state: { kind: 'pending', id: made },
      scroll: false,
    });
  });

  it('scrolls to a revealed capture no second time', () => {
    expect(revealCard({ kind: 'done', id: made }, made, made, true).scroll).toBe(false);
  });
});
