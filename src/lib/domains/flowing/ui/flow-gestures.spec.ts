import { describe, expect, it } from 'vitest';
import { FlowGestures } from './flow-gestures';
import type { Press, Release } from './flow-gestures';
import type { KeyPress, PageTurner } from './flow-turn';

const PAGE_WIDTH = 800;

const ONE_POINTER = 1;

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

function pressAt(x: number, held: Partial<Press> = {}): Press {
  return { pointerId: ONE_POINTER, at: { x, y: 200 }, ...held };
}

function releaseAt(x: number, held: Partial<Release> = {}): Release {
  return {
    pointerId: ONE_POINTER,
    at: { x, y: 200 },
    width: PAGE_WIDTH,
    textSelected: false,
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
    typing: false,
    pressesOnSpace: false,
    ...held,
  };
}

describe('FlowGestures', () => {
  it('turns the page when a press and its release stay put on an edge', () => {
    const reader = foliateLike('ltr');
    const gestures = new FlowGestures(reader.pages);

    gestures.pressed(pressAt(760));
    const action = gestures.released(releaseAt(761));

    expect(action).toEqual({ kind: 'turn', move: { kind: 'rightward' } });
    expect(reader.calls).toEqual(['next']);
  });

  it('turns nothing when text is selected as the pointer comes up', () => {
    const reader = foliateLike('ltr');
    const gestures = new FlowGestures(reader.pages);

    gestures.pressed(pressAt(760));
    const action = gestures.released(releaseAt(760, { textSelected: true }));

    expect(action).toEqual({ kind: 'nothing' });
    expect(reader.calls).toEqual([]);
  });

  it('turns nothing when the pointer travelled between the press and the release', () => {
    const reader = foliateLike('ltr');
    const gestures = new FlowGestures(reader.pages);

    gestures.pressed(pressAt(40));
    const action = gestures.released(releaseAt(760));

    expect(action).toEqual({ kind: 'nothing' });
    expect(reader.calls).toEqual([]);
  });

  it('asks for the chrome in the middle of the page instead of turning', () => {
    const reader = foliateLike('ltr');
    const gestures = new FlowGestures(reader.pages);

    gestures.pressed(pressAt(400));
    const action = gestures.released(releaseAt(400));

    expect(action).toEqual({ kind: 'chrome' });
    expect(reader.calls).toEqual([]);
  });

  it('asks for nothing in the middle of the page when the release ended a selection', () => {
    const reader = foliateLike('ltr');
    const gestures = new FlowGestures(reader.pages);

    gestures.pressed(pressAt(400));
    const action = gestures.released(releaseAt(400, { textSelected: true }));

    expect(action).toEqual({ kind: 'nothing' });
    expect(reader.calls).toEqual([]);
  });

  it('asks for nothing in the middle of the page when the pointer travelled', () => {
    const reader = foliateLike('ltr');
    const gestures = new FlowGestures(reader.pages);

    gestures.pressed(pressAt(380));
    const action = gestures.released(releaseAt(400));

    expect(action).toEqual({ kind: 'nothing' });
    expect(reader.calls).toEqual([]);
  });

  it('turns nothing for a release that belongs to another pointer', () => {
    const reader = foliateLike('ltr');
    const gestures = new FlowGestures(reader.pages);

    gestures.pressed(pressAt(760));
    const action = gestures.released(releaseAt(760, { pointerId: 2 }));

    expect(action).toEqual({ kind: 'nothing' });
    expect(reader.calls).toEqual([]);
  });

  it('turns nothing for a release with no press before it', () => {
    const reader = foliateLike('ltr');
    const gestures = new FlowGestures(reader.pages);

    expect(gestures.released(releaseAt(760))).toEqual({ kind: 'nothing' });
    expect(reader.calls).toEqual([]);
  });

  it('turns nothing once the press has been cancelled', () => {
    const reader = foliateLike('ltr');
    const gestures = new FlowGestures(reader.pages);

    gestures.pressed(pressAt(760));
    gestures.cancelled(ONE_POINTER);
    const action = gestures.released(releaseAt(760));

    expect(action).toEqual({ kind: 'nothing' });
    expect(reader.calls).toEqual([]);
  });

  it('keeps a press another pointer cancelled', () => {
    const reader = foliateLike('ltr');
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
    const reader = foliateLike('ltr');
    const gestures = new FlowGestures(reader.pages);

    gestures.pressed(pressAt(760));
    gestures.released(releaseAt(760));
    gestures.released(releaseAt(760));

    expect(reader.calls).toEqual(['next']);
  });

  it('advances a right-to-left book from a click on its left edge', () => {
    const reader = foliateLike('rtl');
    const gestures = new FlowGestures(reader.pages);

    gestures.pressed(pressAt(20));
    gestures.released(releaseAt(20));

    expect(reader.calls).toEqual(['next']);
  });

  it('turns the page on an arrow key and reports the move it made', () => {
    const reader = foliateLike('rtl');
    const gestures = new FlowGestures(reader.pages);

    expect(gestures.keyed(pressing('ArrowLeft'))).toEqual({ kind: 'leftward' });
    expect(gestures.keyed(pressing('ArrowDown'))).toEqual({ kind: 'forward' });
    expect(reader.calls).toEqual(['next', 'next']);
  });

  it('turns nothing on a key it does not own or a shortcut', () => {
    const reader = foliateLike('ltr');
    const gestures = new FlowGestures(reader.pages);

    expect(gestures.keyed(pressing('k'))).toEqual({ kind: 'stay' });
    expect(gestures.keyed(pressing('r', { metaKey: true }))).toEqual({ kind: 'stay' });
    expect(gestures.keyed(pressing('ArrowRight', { typing: true }))).toEqual({ kind: 'stay' });
    expect(reader.calls).toEqual([]);
  });
});
