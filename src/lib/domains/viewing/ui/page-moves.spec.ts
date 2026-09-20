import { describe, expect, it } from 'vitest';
import type { LayoutKind, ReadingDirection } from '$lib/shared/layout-kind';
import { moveControls, type MoveIntent } from './page-moves';

function glyphFor(layoutKind: LayoutKind, direction: ReadingDirection, intent: MoveIntent): string {
  const found = moveControls(layoutKind, direction).find((move) => move.intent === intent);
  if (found === undefined) throw new Error(`no ${intent} control for a ${layoutKind} book`);

  return found.glyph;
}

function glyphs(layoutKind: LayoutKind, direction: ReadingDirection): readonly string[] {
  return moveControls(layoutKind, direction).map((move) => move.glyph);
}

describe('moveControls', () => {
  it('points the advancing control leftward in a right-to-left book', () => {
    expect(glyphFor('paged', 'rtl', 'advance')).toBe('‹');
  });

  it('points the retreating control rightward in a right-to-left book', () => {
    expect(glyphFor('paged', 'rtl', 'retreat')).toBe('›');
  });

  it('points the advancing control rightward in a left-to-right book', () => {
    expect(glyphFor('paged', 'ltr', 'advance')).toBe('›');
  });

  it('points the retreating control leftward in a left-to-right book', () => {
    expect(glyphFor('paged', 'ltr', 'retreat')).toBe('‹');
  });

  it('keeps the chevrons in one order whichever way the book reads', () => {
    expect(glyphs('paged', 'rtl')).toEqual(glyphs('paged', 'ltr'));
  });

  it('names both page turns whichever way the book reads', () => {
    expect(moveControls('paged', 'rtl').map((move) => move.label)).toEqual([
      'Next page',
      'Previous page',
    ]);
  });

  it('points a strip downward to advance and upward to retreat', () => {
    expect([
      glyphFor('continuous', 'ltr', 'advance'),
      glyphFor('continuous', 'ltr', 'retreat'),
    ]).toEqual(['↓', '↑']);
  });

  it('turns a strip no other way for a right-to-left book', () => {
    expect(glyphs('continuous', 'rtl')).toEqual(glyphs('continuous', 'ltr'));
  });
});
