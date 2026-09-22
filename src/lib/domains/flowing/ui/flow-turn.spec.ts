import { describe, expect, it } from 'vitest';
import {
  isTyping,
  keyMove,
  moveForEnd,
  moveForTurn,
  pointerEnded,
  regionAt,
  releaseAction,
  turnOrder,
  turnPage,
} from './flow-turn';
import type {
  FlowMove,
  KeyPress,
  PageTurner,
  Point,
  PointerRelease,
  TypingTarget,
} from './flow-turn';

const STAY: FlowMove = { kind: 'stay' };

const LEFTWARD: FlowMove = { kind: 'leftward' };

const RIGHTWARD: FlowMove = { kind: 'rightward' };

const BACKWARD: FlowMove = { kind: 'backward' };

const FORWARD: FlowMove = { kind: 'forward' };

const ORIGIN: Point = { x: 400, y: 100 };

const PAGE_WIDTH = 800;

function pressing(key: string, held: Partial<Omit<KeyPress, 'key'>> = {}): KeyPress {
  return {
    key,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    typing: false,
    ...held,
  };
}

function releasing(release: Partial<PointerRelease> = {}): PointerRelease {
  const landed = release.to ?? ORIGIN;

  return {
    from: landed,
    to: landed,
    width: PAGE_WIDTH,
    textSelected: false,
    ...release,
  };
}

function foliateLike(dir: 'ltr' | 'rtl'): { readonly pages: PageTurner; readonly calls: string[] } {
  const calls: string[] = [];
  const pages: PageTurner = {
    prev: () => {
      calls.push('prev');
    },
    next: () => {
      calls.push('next');
    },
    goLeft: () => (dir === 'rtl' ? pages.next() : pages.prev()),
    goRight: () => (dir === 'rtl' ? pages.prev() : pages.next()),
  };

  return { pages, calls };
}

describe('keyMove', () => {
  it('sends ArrowLeft leftward and ArrowRight rightward, leaving the flip to the book', () => {
    expect(keyMove(pressing('ArrowLeft'))).toEqual(LEFTWARD);
    expect(keyMove(pressing('ArrowRight'))).toEqual(RIGHTWARD);
  });

  it('reads ArrowUp and PageUp as backward in reading order', () => {
    expect(keyMove(pressing('ArrowUp'))).toEqual(BACKWARD);
    expect(keyMove(pressing('PageUp'))).toEqual(BACKWARD);
  });

  it('reads ArrowDown and PageDown as forward in reading order', () => {
    expect(keyMove(pressing('ArrowDown'))).toEqual(FORWARD);
    expect(keyMove(pressing('PageDown'))).toEqual(FORWARD);
  });

  it('reads Space as forward and Shift with Space as backward', () => {
    expect(keyMove(pressing(' '))).toEqual(FORWARD);
    expect(keyMove(pressing(' ', { shiftKey: true }))).toEqual(BACKWARD);
  });

  it('stays put when Shift is held with anything but Space', () => {
    expect(keyMove(pressing('ArrowLeft', { shiftKey: true }))).toEqual(STAY);
    expect(keyMove(pressing('ArrowRight', { shiftKey: true }))).toEqual(STAY);
    expect(keyMove(pressing('ArrowDown', { shiftKey: true }))).toEqual(STAY);
    expect(keyMove(pressing('PageDown', { shiftKey: true }))).toEqual(STAY);
  });

  it('stays put when a command, control or option key is held', () => {
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', ' ']) {
      expect(keyMove(pressing(key, { metaKey: true }))).toEqual(STAY);
      expect(keyMove(pressing(key, { ctrlKey: true }))).toEqual(STAY);
      expect(keyMove(pressing(key, { altKey: true }))).toEqual(STAY);
    }
  });

  it('stays put while the reader is typing in a field', () => {
    expect(keyMove(pressing('ArrowLeft', { typing: true }))).toEqual(STAY);
    expect(keyMove(pressing(' ', { typing: true }))).toEqual(STAY);
    expect(keyMove(pressing('PageDown', { typing: true }))).toEqual(STAY);
  });

  it('stays put on a key it does not own', () => {
    for (const key of ['a', 'Enter', 'Escape', 'Home', 'End', 'Tab', 'k']) {
      expect(keyMove(pressing(key))).toEqual(STAY);
    }
  });
});

describe('isTyping', () => {
  it('reports an input, a select and a text area as typing', () => {
    for (const tagName of ['INPUT', 'SELECT', 'TEXTAREA', 'input', 'textarea']) {
      expect(isTyping({ tagName, type: null, editable: false })).toBe(true);
    }
  });

  it('reports a text field as typing whatever it calls its type', () => {
    for (const type of ['text', 'search', 'email', 'number', 'password']) {
      expect(isTyping({ tagName: 'INPUT', type, editable: false })).toBe(true);
    }
  });

  it('reports a select and a text area as typing, types and all', () => {
    expect(isTyping({ tagName: 'SELECT', type: 'select-one', editable: false })).toBe(true);
    expect(isTyping({ tagName: 'TEXTAREA', type: 'textarea', editable: false })).toBe(true);
  });

  it('reports a range slider as not typing, however it is cased', () => {
    expect(isTyping({ tagName: 'INPUT', type: 'range', editable: false })).toBe(false);
    expect(isTyping({ tagName: 'input', type: 'Range', editable: false })).toBe(false);
  });

  it('reports an editable element as typing whatever its tag', () => {
    expect(isTyping({ tagName: 'DIV', type: null, editable: true })).toBe(true);
  });

  it('reports an ordinary element as not typing', () => {
    expect(isTyping({ tagName: 'P', type: null, editable: false })).toBe(false);
    expect(isTyping({ tagName: 'BUTTON', type: 'button', editable: false })).toBe(false);
  });

  it('reports nothing as not typing', () => {
    expect(isTyping(null)).toBe(false);
  });
});

describe('the keys over a focused progress slider', () => {
  const SCRUB: TypingTarget = { tagName: 'INPUT', type: 'range', editable: false };

  const FIELD: TypingTarget = { tagName: 'INPUT', type: 'text', editable: false };

  const TURNING_KEYS = [
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'PageUp',
    'PageDown',
    ' ',
  ];

  it('turns the page on every key that moves a reader through a book', () => {
    for (const key of TURNING_KEYS) {
      expect(keyMove(pressing(key, { typing: isTyping(SCRUB) }))).not.toEqual(STAY);
    }
  });

  it('leaves those same keys to a text field', () => {
    for (const key of TURNING_KEYS) {
      expect(keyMove(pressing(key, { typing: isTyping(FIELD) }))).toEqual(STAY);
    }
  });
});

describe('regionAt', () => {
  it('names the leading quarter the left edge', () => {
    expect(regionAt(0, PAGE_WIDTH)).toEqual({ kind: 'left-edge' });
    expect(regionAt(199, PAGE_WIDTH)).toEqual({ kind: 'left-edge' });
  });

  it('names the trailing quarter the right edge', () => {
    expect(regionAt(601, PAGE_WIDTH)).toEqual({ kind: 'right-edge' });
    expect(regionAt(PAGE_WIDTH, PAGE_WIDTH)).toEqual({ kind: 'right-edge' });
  });

  it('names everything between the two edges the middle', () => {
    expect(regionAt(200, PAGE_WIDTH)).toEqual({ kind: 'middle' });
    expect(regionAt(400, PAGE_WIDTH)).toEqual({ kind: 'middle' });
    expect(regionAt(600, PAGE_WIDTH)).toEqual({ kind: 'middle' });
  });

  it('names the middle when there is no width to divide', () => {
    expect(regionAt(10, 0)).toEqual({ kind: 'middle' });
    expect(regionAt(10, -800)).toEqual({ kind: 'middle' });
    expect(regionAt(Number.NaN, PAGE_WIDTH)).toEqual({ kind: 'middle' });
    expect(regionAt(10, Number.NaN)).toEqual({ kind: 'middle' });
  });
});

describe('pointerEnded', () => {
  it('refuses a release that leaves text selected, wherever it landed', () => {
    expect(pointerEnded(releasing({ textSelected: true }))).toEqual({ kind: 'selecting' });
    expect(pointerEnded(releasing({ to: { x: 4, y: 100 }, textSelected: true }))).toEqual({
      kind: 'selecting',
    });
  });

  it('refuses a release the pointer travelled away from', () => {
    expect(pointerEnded(releasing({ from: ORIGIN, to: { x: 440, y: 100 } }))).toEqual({
      kind: 'dragged',
    });
    expect(pointerEnded(releasing({ from: ORIGIN, to: { x: 400, y: 140 } }))).toEqual({
      kind: 'dragged',
    });
    expect(pointerEnded(releasing({ from: ORIGIN, to: { x: 360, y: 100 } }))).toEqual({
      kind: 'dragged',
    });
  });

  it('allows a release a hand tremor moved, under the slop', () => {
    expect(pointerEnded(releasing({ from: { x: 4, y: 100 }, to: { x: 6, y: 102 } }))).toEqual({
      kind: 'click',
      region: { kind: 'left-edge' },
    });
  });

  it('reports a still release as a click on the region it landed in', () => {
    expect(pointerEnded(releasing({ from: { x: 4, y: 9 }, to: { x: 4, y: 9 } }))).toEqual({
      kind: 'click',
      region: { kind: 'left-edge' },
    });
    expect(pointerEnded(releasing({ from: { x: 780, y: 9 }, to: { x: 780, y: 9 } }))).toEqual({
      kind: 'click',
      region: { kind: 'right-edge' },
    });
    expect(pointerEnded(releasing())).toEqual({ kind: 'click', region: { kind: 'middle' } });
  });
});

describe('turnPage', () => {
  it('turns leftward with goLeft and rightward with goRight', () => {
    const reader = foliateLike('ltr');

    turnPage(reader.pages, LEFTWARD);
    turnPage(reader.pages, RIGHTWARD);

    expect(reader.calls).toEqual(['prev', 'next']);
  });

  it('steps backward with prev and forward with next, whatever the book direction', () => {
    const western = foliateLike('ltr');
    const japanese = foliateLike('rtl');

    turnPage(western.pages, BACKWARD);
    turnPage(western.pages, FORWARD);
    turnPage(japanese.pages, BACKWARD);
    turnPage(japanese.pages, FORWARD);

    expect(western.calls).toEqual(['prev', 'next']);
    expect(japanese.calls).toEqual(['prev', 'next']);
  });

  it('calls nothing when the reader asked for nothing', () => {
    const reader = foliateLike('ltr');

    turnPage(reader.pages, STAY);

    expect(reader.calls).toEqual([]);
  });

  it('retreats a left-to-right book when the left edge is clicked', () => {
    const reader = foliateLike('ltr');

    turnPage(reader.pages, moveForEnd(pointerEnded(releasing({ to: { x: 4, y: 9 } }))));

    expect(reader.calls).toEqual(['prev']);
  });

  it('advances a right-to-left book when the left edge is clicked', () => {
    const reader = foliateLike('rtl');

    turnPage(reader.pages, moveForEnd(pointerEnded(releasing({ to: { x: 4, y: 9 } }))));

    expect(reader.calls).toEqual(['next']);
  });

  it('advances a left-to-right book when the right edge is clicked', () => {
    const reader = foliateLike('ltr');

    turnPage(reader.pages, moveForEnd(pointerEnded(releasing({ to: { x: 796, y: 9 } }))));

    expect(reader.calls).toEqual(['next']);
  });

  it('retreats a right-to-left book when the right edge is clicked', () => {
    const reader = foliateLike('rtl');

    turnPage(reader.pages, moveForEnd(pointerEnded(releasing({ to: { x: 796, y: 9 } }))));

    expect(reader.calls).toEqual(['prev']);
  });

  it('calls nothing for a click in the middle of either book', () => {
    const western = foliateLike('ltr');
    const japanese = foliateLike('rtl');

    turnPage(western.pages, moveForEnd(pointerEnded(releasing())));
    turnPage(japanese.pages, moveForEnd(pointerEnded(releasing())));

    expect(western.calls).toEqual([]);
    expect(japanese.calls).toEqual([]);
  });

  it('calls nothing for a click that ended with text selected, at either edge', () => {
    const western = foliateLike('ltr');
    const japanese = foliateLike('rtl');
    const onTheEdge = releasing({ to: { x: 4, y: 9 }, textSelected: true });

    turnPage(western.pages, moveForEnd(pointerEnded(onTheEdge)));
    turnPage(japanese.pages, moveForEnd(pointerEnded(onTheEdge)));

    expect(western.calls).toEqual([]);
    expect(japanese.calls).toEqual([]);
  });
});

describe('releaseAction', () => {
  it('turns the page for a click on either edge', () => {
    expect(releaseAction(pointerEnded(releasing({ to: { x: 4, y: 9 } })))).toEqual({
      kind: 'turn',
      move: { kind: 'leftward' },
    });
    expect(releaseAction(pointerEnded(releasing({ to: { x: 780, y: 9 } })))).toEqual({
      kind: 'turn',
      move: { kind: 'rightward' },
    });
  });

  it('wakes the chrome for a click between the edges', () => {
    expect(releaseAction(pointerEnded(releasing()))).toEqual({ kind: 'chrome' });
  });

  it('does nothing at all for a release that ended a selection', () => {
    expect(releaseAction(pointerEnded(releasing({ textSelected: true })))).toEqual({
      kind: 'nothing',
    });
    expect(
      releaseAction(pointerEnded(releasing({ to: { x: 4, y: 9 }, textSelected: true }))),
    ).toEqual({ kind: 'nothing' });
  });

  it('does nothing at all for a release the pointer travelled away from', () => {
    expect(
      releaseAction(pointerEnded(releasing({ from: ORIGIN, to: { x: 440, y: 100 } }))),
    ).toEqual({ kind: 'nothing' });
  });
});

describe('turnOrder', () => {
  it('puts the previous page on the left of a left-to-right book', () => {
    expect(turnOrder('ltr')).toEqual(['previous', 'next']);
  });

  it('puts the next page on the left of a right-to-left book', () => {
    expect(turnOrder('rtl')).toEqual(['next', 'previous']);
  });
});

describe('moveForTurn', () => {
  it('turns in reading order, leaving the sides to the edges and the arrows', () => {
    const japanese = foliateLike('rtl');

    turnPage(japanese.pages, moveForTurn('previous'));
    turnPage(japanese.pages, moveForTurn('next'));

    expect(japanese.calls).toEqual(['prev', 'next']);
  });
});
