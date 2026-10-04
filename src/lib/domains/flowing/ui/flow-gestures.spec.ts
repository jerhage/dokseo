import { describe, expect, it } from 'vitest';
import { FlowGestures } from './flow-gestures';
import type { Press, Release } from './flow-gestures';
import type { FlowAction, FlowMove, KeyPress, PageTurner } from './flow-turn';

const PAGE_WIDTH = 800;

const ONE_POINTER = 1;

function foliateLike(): { readonly pages: PageTurner; readonly calls: string[] } {
  const calls: string[] = [];
  const pages: PageTurner = {
    prev: () => {
      calls.push('prev');
    },
    next: () => {
      calls.push('next');
    },
    goLeft: () => pages.prev(),
    goRight: () => pages.next(),
  };

  return { pages, calls };
}

function pressAt(x: number, held: Partial<Press> = {}): Press {
  return { pointerId: ONE_POINTER, pointerType: 'mouse', at: { x, y: 200 }, ...held };
}

function releaseAt(x: number, held: Partial<Release> = {}): Release {
  return {
    pointerId: ONE_POINTER,
    at: { x, y: 200 },
    width: PAGE_WIDTH,
    textSelected: false,
    turns: 'tap-zones',
    edgeClicksTurn: true,
    chromeShown: false,
    ...held,
  };
}

function pressing(key: string, held: Partial<Omit<KeyPress, 'key'>> = {}): KeyPress {
  return {
    key,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    focus: { kind: 'elsewhere' },
    ...held,
  };
}

type ReleaseRow = {
  readonly name: string;
  readonly pointerType: string;
  readonly from: number;
  readonly to: number;
  readonly held: Partial<Release>;
  readonly action: FlowAction;
  readonly calls: readonly string[];
};

const RIGHTWARD_TURN: FlowAction = { kind: 'turn', move: { kind: 'rightward' } };

const LEFTWARD_TURN: FlowAction = { kind: 'turn', move: { kind: 'leftward' } };

const CHROME: FlowAction = { kind: 'chrome' };

const NOTHING: FlowAction = { kind: 'nothing' };

const RELEASES: readonly ReleaseRow[] = [
  {
    name: 'a mouse press and release that stay put on an edge',
    pointerType: 'mouse',
    from: 760,
    to: 761,
    held: {},
    action: RIGHTWARD_TURN,
    calls: ['next'],
  },
  {
    name: 'a release on an edge with text selected',
    pointerType: 'mouse',
    from: 760,
    to: 760,
    held: { textSelected: true },
    action: NOTHING,
    calls: [],
  },
  {
    name: 'a pointer that travelled between the press and the release',
    pointerType: 'mouse',
    from: 40,
    to: 760,
    held: {},
    action: NOTHING,
    calls: [],
  },
  {
    name: 'a click in the middle of the page',
    pointerType: 'mouse',
    from: 400,
    to: 400,
    held: {},
    action: CHROME,
    calls: [],
  },
  {
    name: 'a release in the middle of the page that ended a selection',
    pointerType: 'mouse',
    from: 400,
    to: 400,
    held: { textSelected: true },
    action: NOTHING,
    calls: [],
  },
  {
    name: 'a pointer that travelled in the middle of the page',
    pointerType: 'mouse',
    from: 380,
    to: 400,
    held: {},
    action: NOTHING,
    calls: [],
  },
  {
    name: 'a finger that drifts six pixels in the middle of the page',
    pointerType: 'touch',
    from: 400,
    to: 406,
    held: {},
    action: CHROME,
    calls: [],
  },
  {
    name: 'a finger that drifts six pixels on an edge',
    pointerType: 'touch',
    from: 760,
    to: 766,
    held: {},
    action: RIGHTWARD_TURN,
    calls: ['next'],
  },
  {
    name: 'a finger tap a quarter of the way in',
    pointerType: 'touch',
    from: PAGE_WIDTH / 4,
    to: PAGE_WIDTH / 4,
    held: {},
    action: LEFTWARD_TURN,
    calls: ['prev'],
  },
  {
    name: 'a mouse click a quarter of the way in',
    pointerType: 'mouse',
    from: PAGE_WIDTH / 4,
    to: PAGE_WIDTH / 4,
    held: {},
    action: CHROME,
    calls: [],
  },
  {
    name: 'a mouse that drifts six pixels',
    pointerType: 'mouse',
    from: 400,
    to: 406,
    held: {},
    action: NOTHING,
    calls: [],
  },
  {
    name: 'a finger tap on an edge when only a swipe turns',
    pointerType: 'touch',
    from: 4,
    to: 4,
    held: { turns: 'swipe-only' },
    action: CHROME,
    calls: [],
  },
  {
    name: 'a finger tap on an edge while the chrome is up',
    pointerType: 'touch',
    from: 760,
    to: 760,
    held: { chromeShown: true },
    action: CHROME,
    calls: [],
  },
  {
    name: 'a mouse click on an edge when edge clicks do not turn',
    pointerType: 'mouse',
    from: 760,
    to: 760,
    held: { edgeClicksTurn: false },
    action: CHROME,
    calls: [],
  },
  {
    name: 'a finger tap on an edge when edge clicks do not turn',
    pointerType: 'touch',
    from: 4,
    to: 4,
    held: { edgeClicksTurn: false },
    action: LEFTWARD_TURN,
    calls: ['prev'],
  },
];

const KEYS: readonly (readonly [
  string,
  Partial<Omit<KeyPress, 'key'>>,
  FlowMove,
  readonly string[],
])[] = [
  ['ArrowLeft', {}, { kind: 'leftward' }, ['prev']],
  ['ArrowDown', {}, { kind: 'forward' }, ['next']],
  ['k', {}, { kind: 'stay' }, []],
  ['r', { metaKey: true }, { kind: 'stay' }, []],
  ['ArrowRight', { focus: { kind: 'typing' } }, { kind: 'stay' }, []],
];

describe('FlowGestures', () => {
  it.each(RELEASES)(
    'answers $name with the action flow-turn gives, and turns only on a turn',
    ({ pointerType, from, to, held, action, calls }) => {
      const reader = foliateLike();
      const gestures = new FlowGestures(reader.pages);

      gestures.pressed(pressAt(from, { pointerType }));
      const answered = gestures.released(releaseAt(to, held));

      expect(answered).toEqual(action);
      expect(reader.calls).toEqual(calls);
    },
  );

  it('turns nothing for a release that belongs to another pointer', () => {
    const reader = foliateLike();
    const gestures = new FlowGestures(reader.pages);

    gestures.pressed(pressAt(760));
    const action = gestures.released(releaseAt(760, { pointerId: 2 }));

    expect(action).toEqual({ kind: 'nothing' });
    expect(reader.calls).toEqual([]);
  });

  it('turns nothing for a release with no press before it', () => {
    const reader = foliateLike();
    const gestures = new FlowGestures(reader.pages);

    expect(gestures.released(releaseAt(760))).toEqual({ kind: 'nothing' });
    expect(reader.calls).toEqual([]);
  });

  it('turns nothing once the press has been cancelled', () => {
    const reader = foliateLike();
    const gestures = new FlowGestures(reader.pages);

    gestures.pressed(pressAt(760));
    gestures.cancelled(ONE_POINTER);
    const action = gestures.released(releaseAt(760));

    expect(action).toEqual({ kind: 'nothing' });
    expect(reader.calls).toEqual([]);
  });

  it('keeps a press another pointer cancelled', () => {
    const reader = foliateLike();
    const gestures = new FlowGestures(reader.pages);

    gestures.pressed(pressAt(760));
    gestures.cancelled(9);

    expect(gestures.released(releaseAt(760))).toEqual({
      kind: 'turn',
      move: { kind: 'rightward' },
    });
    expect(reader.calls).toEqual(['next']);
  });

  it('turns one page per press, not one per release', () => {
    const reader = foliateLike();
    const gestures = new FlowGestures(reader.pages);

    gestures.pressed(pressAt(760));
    gestures.released(releaseAt(760));
    gestures.released(releaseAt(760));

    expect(reader.calls).toEqual(['next']);
  });

  it.each(KEYS)('makes and reports the move %s asks for, held as %j', (key, held, move, calls) => {
    const reader = foliateLike();
    const gestures = new FlowGestures(reader.pages);

    expect(gestures.keyed(pressing(key, held))).toEqual(move);
    expect(reader.calls).toEqual(calls);
  });
});

describe('FlowGestures given the touch end after a release', () => {
  it('claims the touch end of a finger tap that turned the page, once', () => {
    const gestures = new FlowGestures(foliateLike().pages);

    gestures.pressed(pressAt(760, { pointerType: 'touch' }));
    gestures.released(releaseAt(760));

    expect([gestures.claimsTouchEnd(), gestures.claimsTouchEnd()]).toEqual([true, false]);
  });

  it.each([
    ['a finger tap in the middle of the page', 400, 400],
    ['a swipe', 600, 760],
  ])('leaves the touch end of %s to foliate', (_gesture, from, to) => {
    const gestures = new FlowGestures(foliateLike().pages);

    gestures.pressed(pressAt(from, { pointerType: 'touch' }));
    gestures.released(releaseAt(to));

    expect(gestures.claimsTouchEnd()).toBe(false);
  });

  it('claims nothing after a mouse click turned the page', () => {
    const gestures = new FlowGestures(foliateLike().pages);

    gestures.pressed(pressAt(760));
    gestures.released(releaseAt(760));

    expect(gestures.claimsTouchEnd()).toBe(false);
  });

  it('drops the claim of a turning tap when the next press begins', () => {
    const gestures = new FlowGestures(foliateLike().pages);

    gestures.pressed(pressAt(760, { pointerType: 'touch' }));
    gestures.released(releaseAt(760));
    gestures.pressed(pressAt(400, { pointerType: 'touch' }));

    expect(gestures.claimsTouchEnd()).toBe(false);
  });
});
