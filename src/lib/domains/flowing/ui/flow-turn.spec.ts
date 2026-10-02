import { describe, expect, it } from 'vitest';
import { relaysToHost } from '$lib/platform/dom/key-relay';
import { CLICK_EDGE_SHARE } from '$lib/shared/page-turn';
import {
  dismissesTheArrival,
  FRAME_NOWHERE_ON_THE_STAGE,
  HOST_VIEWPORT_ORIGIN,
  isTyping,
  keyMove,
  moveForEnd,
  moveForTurn,
  pointerEnded,
  pressesOnSpace,
  regionAt,
  releaseAction,
  tapOnStage,
  touchRegionAt,
  turnOrder,
  turnPage,
  turnTowards,
} from './flow-turn';
import type {
  FlowMove,
  KeyPress,
  KeyTarget,
  PageTurner,
  Point,
  PointerRelease,
  StageBox,
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
    pressesOnSpace: false,
    ...held,
  };
}

function targeting(tagName: string, carried: Partial<Omit<KeyTarget, 'tagName'>> = {}): KeyTarget {
  return { tagName, type: null, role: null, editable: false, ...carried };
}

function over(
  key: string,
  target: KeyTarget | null,
  held: Partial<Omit<KeyPress, 'key'>> = {},
): KeyPress {
  return pressing(key, {
    typing: isTyping(target),
    pressesOnSpace: pressesOnSpace(target),
    ...held,
  });
}

const SCRUB: KeyTarget = targeting('INPUT', { type: 'range' });

const FIELD: KeyTarget = targeting('INPUT', { type: 'text' });

const TOOL: KeyTarget = targeting('BUTTON', { type: 'button' });

const WIDGET: KeyTarget = targeting('DIV', { role: 'button' });

const BACK_LINK: KeyTarget = targeting('A');

const TURNING_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', ' '];

const EVERY_TARGET: readonly (KeyTarget | null)[] = [
  null,
  SCRUB,
  FIELD,
  TOOL,
  WIDGET,
  BACK_LINK,
  targeting('P'),
];

const HELD_DOWN: readonly Partial<Omit<KeyPress, 'key'>>[] = [
  {},
  { shiftKey: true },
  { altKey: true },
  { ctrlKey: true },
  { metaKey: true },
];

function relaying(key: string, held: Partial<Omit<KeyPress, 'key'>>): boolean {
  return relaysToHost({
    key,
    ctrlKey: held.ctrlKey ?? false,
    metaKey: held.metaKey ?? false,
    defaultPrevented: false,
    relayed: false,
  });
}

function releasing(release: Partial<PointerRelease> = {}): PointerRelease {
  const landed = release.to ?? ORIGIN;

  return {
    from: landed,
    to: landed,
    pointerType: 'mouse',
    width: PAGE_WIDTH,
    textSelected: false,
    turns: 'tap-zones',
    edgeClicksTurn: true,
    chromeShown: false,
    ...release,
  };
}

function recording(): { readonly pages: PageTurner; readonly calls: string[] } {
  const calls: string[] = [];
  const pages: PageTurner = {
    prev: () => {
      calls.push('prev');
    },
    next: () => {
      calls.push('next');
    },
    goLeft: () => {
      calls.push('goLeft');
    },
    goRight: () => {
      calls.push('goRight');
    },
  };

  return { pages, calls };
}

describe('dismissesTheArrival', () => {
  it('dismisses the mark when a tap turns the page', () => {
    expect(dismissesTheArrival({ kind: 'turn', move: { kind: 'forward' } })).toBe(true);
  });

  it('dismisses the mark when a tap in the middle asks for the bars', () => {
    expect(dismissesTheArrival({ kind: 'chrome' })).toBe(true);
  });

  it('leaves the mark alone when a drag ends in nothing', () => {
    expect(dismissesTheArrival({ kind: 'nothing' })).toBe(false);
  });
});

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
  const TYPED_INTO: readonly KeyTarget[] = [
    targeting('INPUT'),
    targeting('SELECT'),
    targeting('TEXTAREA'),
    targeting('input'),
    targeting('textarea'),
    ...['text', 'search', 'email', 'number', 'password'].map((type) =>
      targeting('INPUT', { type }),
    ),
    targeting('SELECT', { type: 'select-one' }),
    targeting('TEXTAREA', { type: 'textarea' }),
  ];

  it('reports an input, a select and a text area as typing, whatever it calls its type', () => {
    for (const target of TYPED_INTO) {
      expect(isTyping(target)).toBe(true);
    }
  });

  it('reports a range slider as not typing, however it is cased', () => {
    expect(isTyping(targeting('INPUT', { type: 'range' }))).toBe(false);
    expect(isTyping(targeting('input', { type: 'Range' }))).toBe(false);
  });

  it('reports an editable element as typing whatever its tag', () => {
    expect(isTyping(targeting('DIV', { editable: true }))).toBe(true);
  });

  it('reports an ordinary element as not typing', () => {
    expect(isTyping(targeting('P'))).toBe(false);
    expect(isTyping(targeting('BUTTON', { type: 'button' }))).toBe(false);
  });

  it('reports nothing as not typing', () => {
    expect(isTyping(null)).toBe(false);
  });
});

describe('pressesOnSpace', () => {
  it('reports a button as pressed, however its tag is cased', () => {
    expect(pressesOnSpace(targeting('BUTTON', { type: 'button' }))).toBe(true);
    expect(pressesOnSpace(targeting('button'))).toBe(true);
  });

  it('reports an element that calls itself a button as pressed', () => {
    expect(pressesOnSpace(targeting('DIV', { role: 'button' }))).toBe(true);
    expect(pressesOnSpace(targeting('SPAN', { role: 'Button' }))).toBe(true);
  });

  it('reports a link as not pressed, whatever the browser scrolls instead', () => {
    expect(pressesOnSpace(targeting('A'))).toBe(false);
  });

  it('reports an element wearing another role, the progress slider and an ordinary element as not pressed', () => {
    for (const target of [
      targeting('DIV', { role: 'group' }),
      targeting('SUMMARY'),
      targeting('INPUT', { type: 'range' }),
      targeting('P'),
    ]) {
      expect(pressesOnSpace(target)).toBe(false);
    }
  });

  it('reports nothing as not pressed', () => {
    expect(pressesOnSpace(null)).toBe(false);
  });
});

describe('the keys over a focused progress slider', () => {
  it('turns the page on every key that moves a reader through a book', () => {
    for (const key of TURNING_KEYS) {
      expect(keyMove(over(key, SCRUB))).not.toEqual(STAY);
    }
  });

  it('leaves those same keys to a text field', () => {
    for (const key of TURNING_KEYS) {
      expect(keyMove(over(key, FIELD))).toEqual(STAY);
    }
  });
});

describe('the space bar over a focused chrome control', () => {
  it('leaves Space to a button and to anything wearing its role', () => {
    expect(keyMove(over(' ', TOOL))).toEqual(STAY);
    expect(keyMove(over(' ', WIDGET))).toEqual(STAY);
  });

  it('leaves Shift with Space to those same controls, which a browser presses too', () => {
    expect(keyMove(over(' ', TOOL, { shiftKey: true }))).toEqual(STAY);
    expect(keyMove(over(' ', WIDGET, { shiftKey: true }))).toEqual(STAY);
  });

  it('turns the page on every other key over a focused button', () => {
    for (const key of TURNING_KEYS.filter((turning) => turning !== ' ')) {
      expect(keyMove(over(key, TOOL))).not.toEqual(STAY);
    }
  });

  it('advances the book on Space over the back link, the slider and the page itself', () => {
    expect(keyMove(over(' ', BACK_LINK))).toEqual(FORWARD);
    expect(keyMove(over(' ', SCRUB))).toEqual(FORWARD);
    expect(keyMove(over(' ', targeting('P')))).toEqual(FORWARD);
    expect(keyMove(over(' ', null))).toEqual(FORWARD);
  });

  it('retreats on Shift with Space over the back link and the slider', () => {
    expect(keyMove(over(' ', BACK_LINK, { shiftKey: true }))).toEqual(BACKWARD);
    expect(keyMove(over(' ', SCRUB, { shiftKey: true }))).toEqual(BACKWARD);
  });

  it('stays put on Space over a text field, which is typed into, not pressed', () => {
    expect(keyMove(over(' ', FIELD))).toEqual(STAY);
    expect(keyMove(over(' ', targeting('DIV', { editable: true })))).toEqual(STAY);
  });
});

describe('the keys a chapter relays out to the host window', () => {
  it('leaves every relayed press alone, whatever the host says it landed on', () => {
    for (const key of [...TURNING_KEYS, 'Escape', 'Home', 'End', 'k', 'K']) {
      for (const held of HELD_DOWN.filter((down) => relaying(key, down))) {
        for (const target of EVERY_TARGET) {
          expect(keyMove(over(key, target, held))).toEqual(STAY);
        }
      }
    }
  });
});

describe('regionAt', () => {
  const EDGE = PAGE_WIDTH * CLICK_EDGE_SHARE;

  it('names the leading strip the left edge', () => {
    expect(regionAt(0, PAGE_WIDTH)).toEqual({ kind: 'left-edge' });
    expect(regionAt(EDGE - 1, PAGE_WIDTH)).toEqual({ kind: 'left-edge' });
  });

  it('names the trailing strip the right edge', () => {
    expect(regionAt(PAGE_WIDTH - EDGE + 1, PAGE_WIDTH)).toEqual({ kind: 'right-edge' });
    expect(regionAt(PAGE_WIDTH, PAGE_WIDTH)).toEqual({ kind: 'right-edge' });
  });

  it('names everything between the two strips the middle', () => {
    expect(regionAt(EDGE, PAGE_WIDTH)).toEqual({ kind: 'middle' });
    expect(regionAt(PAGE_WIDTH / 2, PAGE_WIDTH)).toEqual({ kind: 'middle' });
    expect(regionAt(PAGE_WIDTH - EDGE, PAGE_WIDTH)).toEqual({ kind: 'middle' });
  });

  it('leaves most of the page to the reader, not to turning', () => {
    expect(CLICK_EDGE_SHARE * 2).toBeLessThanOrEqual(0.2);
  });

  it('names the middle when there is no width to divide', () => {
    expect(regionAt(10, 0)).toEqual({ kind: 'middle' });
    expect(regionAt(10, -800)).toEqual({ kind: 'middle' });
    expect(regionAt(Number.NaN, PAGE_WIDTH)).toEqual({ kind: 'middle' });
    expect(regionAt(10, Number.NaN)).toEqual({ kind: 'middle' });
  });
});

describe('touchRegionAt', () => {
  it('turns from the outer thirds of the page for a finger', () => {
    expect(touchRegionAt(200, PAGE_WIDTH, 'tap-zones', false)).toEqual({ kind: 'left-edge' });
    expect(touchRegionAt(400, PAGE_WIDTH, 'tap-zones', false)).toEqual({ kind: 'middle' });
    expect(touchRegionAt(600, PAGE_WIDTH, 'tap-zones', false)).toEqual({ kind: 'right-edge' });
  });

  it('names every finger tap the middle when only a swipe turns', () => {
    expect(touchRegionAt(4, PAGE_WIDTH, 'swipe-only', false)).toEqual({ kind: 'middle' });
    expect(touchRegionAt(796, PAGE_WIDTH, 'swipe-only', false)).toEqual({ kind: 'middle' });
  });

  it('names every finger tap the middle while the chrome is up', () => {
    expect(touchRegionAt(4, PAGE_WIDTH, 'tap-zones', true)).toEqual({ kind: 'middle' });
    expect(touchRegionAt(796, PAGE_WIDTH, 'tap-zones', true)).toEqual({ kind: 'middle' });
  });
});

describe('pointerEnded', () => {
  it('turns from a quarter of the way in for a finger and not for a mouse', () => {
    const quarter = { x: PAGE_WIDTH / 4, y: 100 };

    expect(pointerEnded(releasing({ to: quarter, pointerType: 'touch' }))).toEqual({
      kind: 'click',
      region: { kind: 'left-edge' },
    });
    expect(pointerEnded(releasing({ to: quarter, pointerType: 'mouse' }))).toEqual({
      kind: 'click',
      region: { kind: 'middle' },
    });
  });

  it('keeps the mouse edges for a pen', () => {
    expect(
      pointerEnded(releasing({ to: { x: PAGE_WIDTH / 4, y: 100 }, pointerType: 'pen' })),
    ).toEqual({ kind: 'click', region: { kind: 'middle' } });
  });

  it('keeps the mouse edges whatever the touch variant and the chrome', () => {
    const edge = { x: 4, y: 100 };

    expect(
      pointerEnded(
        releasing({ to: edge, pointerType: 'mouse', turns: 'swipe-only', chromeShown: true }),
      ),
    ).toEqual({ kind: 'click', region: { kind: 'left-edge' } });
  });

  it('names every mouse and pen click the middle when edge clicks do not turn', () => {
    for (const pointerType of ['mouse', 'pen']) {
      for (const x of [4, PAGE_WIDTH / 2, PAGE_WIDTH - 4]) {
        expect(
          releaseAction(
            pointerEnded(releasing({ to: { x, y: 100 }, pointerType, edgeClicksTurn: false })),
          ),
        ).toEqual({ kind: 'chrome' });
      }
    }
  });

  it('keeps the finger tap zones when edge clicks do not turn', () => {
    expect(
      pointerEnded(
        releasing({ to: { x: 4, y: 100 }, pointerType: 'touch', edgeClicksTurn: false }),
      ),
    ).toEqual({ kind: 'click', region: { kind: 'left-edge' } });
  });

  const FINGER_CHROME: readonly (readonly [string, Partial<PointerRelease>])[] = [
    ['while the chrome is up', { chromeShown: true }],
    ['when only a swipe turns', { turns: 'swipe-only' }],
  ];

  it.each(FINGER_CHROME)('asks for the chrome for a finger tap on an edge %s', (_case, held) => {
    expect(
      releaseAction(
        pointerEnded(releasing({ to: { x: 4, y: 100 }, pointerType: 'touch', ...held })),
      ),
    ).toEqual({ kind: 'chrome' });
  });

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

  it('allows a finger that drifted six pixels, so a tap on a phone still lands', () => {
    expect(
      pointerEnded(
        releasing({ from: { x: 400, y: 100 }, to: { x: 406, y: 94 }, pointerType: 'touch' }),
      ),
    ).toEqual({ kind: 'click', region: { kind: 'middle' } });
  });

  it('refuses a mouse that drifted six pixels', () => {
    expect(
      pointerEnded(
        releasing({ from: { x: 400, y: 100 }, to: { x: 406, y: 94 }, pointerType: 'mouse' }),
      ),
    ).toEqual({ kind: 'dragged' });
  });

  it('refuses a finger that travelled twelve pixels', () => {
    expect(
      pointerEnded(
        releasing({ from: { x: 400, y: 100 }, to: { x: 412, y: 100 }, pointerType: 'touch' }),
      ),
    ).toEqual({ kind: 'dragged' });
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
    const reader = recording();

    turnPage(reader.pages, LEFTWARD);
    turnPage(reader.pages, RIGHTWARD);

    expect(reader.calls).toEqual(['goLeft', 'goRight']);
  });

  it('steps backward with prev and forward with next', () => {
    const reader = recording();

    turnPage(reader.pages, BACKWARD);
    turnPage(reader.pages, FORWARD);

    expect(reader.calls).toEqual(['prev', 'next']);
  });

  it('calls nothing when the reader asked for nothing', () => {
    const reader = recording();

    turnPage(reader.pages, STAY);

    expect(reader.calls).toEqual([]);
  });
});

describe('moveForEnd', () => {
  const ENDS: readonly (readonly [string, PointerRelease, FlowMove])[] = [
    ['a click on the left edge leftward', releasing({ to: { x: 4, y: 9 } }), LEFTWARD],
    ['a click on the right edge rightward', releasing({ to: { x: 796, y: 9 } }), RIGHTWARD],
    ['a click in the middle nowhere', releasing(), STAY],
    [
      'a click that ended with text selected nowhere, even on an edge',
      releasing({ to: { x: 4, y: 9 }, textSelected: true }),
      STAY,
    ],
    [
      'a release the pointer travelled away from nowhere',
      releasing({ from: ORIGIN, to: { x: 440, y: 100 } }),
      STAY,
    ],
  ];

  it.each(ENDS)('sends %s', (_case, release, move) => {
    expect(moveForEnd(pointerEnded(release))).toEqual(move);
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
    const reader = recording();

    turnPage(reader.pages, moveForTurn('previous'));
    turnPage(reader.pages, moveForTurn('next'));

    expect(reader.calls).toEqual(['prev', 'next']);
  });
});

describe('turnTowards', () => {
  it('matches the footer slot on each side in both directions', () => {
    for (const direction of ['ltr', 'rtl'] as const) {
      expect([turnTowards('left', direction), turnTowards('right', direction)]).toEqual(
        turnOrder(direction),
      );
    }
  });
});

const STAGE: StageBox = { left: 0, top: 0, width: 414 };

const COLUMNISED_FRAME_WIDTH = 8471;

const FRAME_AT_THE_FIRST_PAGE: Point = { x: 15, y: 48 };

const FRAME_TWO_PAGES_IN: Point = { x: -755, y: 48 };

describe('tapOnStage', () => {
  it('places a chapter tap where the reader saw it, not where the frame counts from', () => {
    const spot = tapOnStage({ x: 1128, y: 448 }, FRAME_TWO_PAGES_IN, STAGE);

    expect(spot).toEqual({ at: { x: 373, y: 496 }, width: 414 });
  });

  it('measures against the stage, so the columnised frame width never reaches a region', () => {
    const spot = tapOnStage({ x: 1128, y: 448 }, FRAME_TWO_PAGES_IN, STAGE);

    expect(spot.width).toBe(STAGE.width);
    expect(regionAt(spot.at.x, spot.width)).toEqual({ kind: 'right-edge' });
    expect(regionAt(1128, COLUMNISED_FRAME_WIDTH)).not.toEqual(regionAt(spot.at.x, spot.width));
  });

  it('sorts a chapter tap into the near tenth, the middle and the far tenth', () => {
    const regions = [26, 192, 358].map((x) => {
      const spot = tapOnStage({ x, y: 448 }, FRAME_AT_THE_FIRST_PAGE, STAGE);
      return regionAt(spot.at.x, spot.width).kind;
    });

    expect(regions).toEqual(['left-edge', 'middle', 'right-edge']);
  });

  it('leaves a tap on the stage itself where it landed', () => {
    const inset: StageBox = { left: 20, top: 40, width: 414 };

    expect(tapOnStage({ x: 61, y: 448 }, HOST_VIEWPORT_ORIGIN, inset)).toEqual({
      at: { x: 41, y: 408 },
      width: 414,
    });
  });

  it('decides nothing for a tap whose frame is nowhere on the stage', () => {
    const spot = tapOnStage({ x: 358, y: 448 }, FRAME_NOWHERE_ON_THE_STAGE, STAGE);

    expect(
      releaseAction(
        pointerEnded({
          from: spot.at,
          to: spot.at,
          pointerType: 'mouse',
          width: spot.width,
          textSelected: false,
          turns: 'tap-zones',
          edgeClicksTurn: true,
          chromeShown: false,
        }),
      ),
    ).toEqual({ kind: 'nothing' });
  });
});
