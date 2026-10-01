import { describe, expect, it } from 'vitest';
import {
  QUOTE_CONTEXT_CHARS,
  liftMetrics,
  liftPlacement,
  liftSpot,
  liftsAnything,
  offerMove,
  passageQuote,
  rectOnStage,
} from './flow-lift';
import type { LiftMetrics, LiftRect, StageSize } from './flow-lift';
import { FRAME_NOWHERE_ON_THE_STAGE, HOST_VIEWPORT_ORIGIN } from './flow-turn';

const STAGE: StageSize = { width: 414, height: 896 };

const LIFT: LiftMetrics = { size: 44, gap: 8 };

function rect(left: number, top: number, right: number, bottom: number): LiftRect {
  return { left, top, right, bottom };
}

function centred(left: number, right: number): number {
  return (left + right) / 2 - LIFT.size / 2;
}

describe('passageQuote', () => {
  it('keeps the selected text as the exact quote, untouched', () => {
    const quote = passageQuote('こっちに来て', 'そして彼は', 'と言った');

    expect(quote.exact).toBe('こっちに来て');
  });

  it('keeps the last 32 characters before the passage and the first 32 after it', () => {
    const before = 'あ'.repeat(100);
    const after = 'い'.repeat(100);

    const quote = passageQuote('海', before, after);

    expect([quote.prefix.length, quote.suffix.length]).toEqual([
      QUOTE_CONTEXT_CHARS,
      QUOTE_CONTEXT_CHARS,
    ]);
  });

  it('keeps the context nearest the passage, not the far end of the chapter', () => {
    const before = `${'あ'.repeat(100)}そして彼は`;
    const after = `と言った${'い'.repeat(100)}`;

    const quote = passageQuote('海', before, after);

    expect(quote.prefix.endsWith('そして彼は')).toBe(true);
    expect(quote.suffix.startsWith('と言った')).toBe(true);
  });

  it('keeps shorter context whole rather than padding it', () => {
    const quote = passageQuote('海', 'そして', 'と');

    expect([quote.prefix, quote.suffix]).toEqual(['そして', 'と']);
  });

  it('keeps no context at all at the very start and the very end of a chapter', () => {
    const quote = passageQuote('海', '', '');

    expect([quote.prefix, quote.suffix]).toEqual(['', '']);
  });

  it('counts a surrogate pair as one character rather than splitting it', () => {
    const before = '𠮟'.repeat(40);

    const quote = passageQuote('海', before, '');

    expect(Array.from(quote.prefix)).toHaveLength(QUOTE_CONTEXT_CHARS);
    expect(quote.prefix).toBe('𠮟'.repeat(QUOTE_CONTEXT_CHARS));
  });
});

describe('liftsAnything', () => {
  it('offers to save a passage holding text', () => {
    expect(liftsAnything('海')).toBe(true);
  });

  it('offers nothing for a selection that is only space', () => {
    expect(liftsAnything('   \n ')).toBe(false);
    expect(liftsAnything('')).toBe(false);
  });
});

describe('rectOnStage', () => {
  it('places a chapter rect where the reader saw it, not where the frame counts from', () => {
    const placed = rectOnStage(
      rect(100, 40, 260, 70),
      { x: -755, y: 0 },
      {
        left: 0,
        top: 0,
        width: 414,
      },
    );

    expect(placed).toEqual({ left: -655, top: 40, right: -495, bottom: 70 });
  });

  it('leaves a rect on the stage itself where it landed', () => {
    const placed = rectOnStage(rect(10, 20, 30, 40), HOST_VIEWPORT_ORIGIN, {
      left: 0,
      top: 0,
      width: 414,
    });

    expect(placed).toEqual({ left: 10, top: 20, right: 30, bottom: 40 });
  });

  it('subtracts the stage offset from a rect measured against the viewport', () => {
    const placed = rectOnStage(rect(110, 60, 130, 80), HOST_VIEWPORT_ORIGIN, {
      left: 100,
      top: 50,
      width: 414,
    });

    expect(placed).toEqual({ left: 10, top: 10, right: 30, bottom: 30 });
  });
});

describe('liftPlacement', () => {
  it('places a lift by the size and the gap it is given', () => {
    const placed = liftPlacement([rect(100, 300, 260, 330)], STAGE, { size: 60, gap: 12 });

    expect(placed).toEqual({ kind: 'above', left: 150, top: 300 - 12 - 60 });
  });

  it('offers the button above the selection when there is room for it', () => {
    const placed = liftPlacement([rect(100, 300, 260, 330)], STAGE, LIFT);

    expect(placed).toEqual({
      kind: 'above',
      left: centred(100, 260),
      top: 300 - LIFT.gap - LIFT.size,
    });
  });

  it('offers the button below a selection sitting against the top of the page', () => {
    const placed = liftPlacement([rect(100, 4, 260, 34)], STAGE, LIFT);

    expect(placed).toEqual({
      kind: 'below',
      left: centred(100, 260),
      top: 34 + LIFT.gap,
    });
  });

  it('offers the button above a selection one pixel clear of the top', () => {
    const roomy = LIFT.gap + LIFT.size;

    expect(liftPlacement([rect(100, roomy, 260, 400)], STAGE, LIFT).kind).toBe('above');
    expect(liftPlacement([rect(100, roomy - 1, 260, 400)], STAGE, LIFT).kind).toBe('below');
  });

  it('keeps the button on the page when the selection runs off the near edge', () => {
    const placed = liftPlacement([rect(-40, 300, 20, 330)], STAGE, LIFT);

    expect(placed).toEqual({
      kind: 'above',
      left: 0,
      top: 300 - LIFT.gap - LIFT.size,
    });
  });

  it('keeps the button on the page when the selection runs off the far edge', () => {
    const placed = liftPlacement([rect(400, 300, 460, 330)], STAGE, LIFT);

    expect(placed).toEqual({
      kind: 'above',
      left: STAGE.width - LIFT.size,
      top: 300 - LIFT.gap - LIFT.size,
    });
  });

  it('keeps the button on the page for a selection against the bottom', () => {
    const placed = liftPlacement([rect(100, 0, 260, 896)], STAGE, LIFT);

    expect(placed).toEqual({
      kind: 'below',
      left: centred(100, 260),
      top: STAGE.height - LIFT.size,
    });
  });

  it('spans the rects of a selection crossing two paragraphs', () => {
    const placed = liftPlacement([rect(200, 300, 380, 320), rect(20, 330, 150, 350)], STAGE, LIFT);

    expect(placed).toEqual({
      kind: 'above',
      left: centred(20, 380),
      top: 300 - LIFT.gap - LIFT.size,
    });
  });

  it('ignores the half of a selection lying on the column the reader cannot see', () => {
    const placed = liftPlacement([rect(200, 300, 380, 320), rect(900, 40, 1080, 60)], STAGE, LIFT);

    expect(placed).toEqual({
      kind: 'above',
      left: centred(200, 380),
      top: 300 - LIFT.gap - LIFT.size,
    });
  });

  it('offers nothing when every rect sits off the page', () => {
    expect(liftPlacement([rect(900, 40, 1080, 60)], STAGE, LIFT).kind).toBe('nowhere');
  });

  it('offers nothing when the selection produced no rect at all', () => {
    expect(liftPlacement([], STAGE, LIFT).kind).toBe('nowhere');
  });

  it('offers nothing for a rect whose frame is nowhere on the stage', () => {
    const lost = rectOnStage(rect(10, 20, 30, 40), FRAME_NOWHERE_ON_THE_STAGE, {
      left: 0,
      top: 0,
      width: 414,
    });

    expect(liftPlacement([lost], STAGE, LIFT).kind).toBe('nowhere');
  });

  it('offers nothing on a stage that has not been laid out', () => {
    expect(liftPlacement([rect(100, 300, 260, 330)], { width: 0, height: 0 }, LIFT).kind).toBe(
      'nowhere',
    );
    expect(
      liftPlacement([rect(100, 300, 260, 330)], { width: Number.NaN, height: 896 }, LIFT).kind,
    ).toBe('nowhere');
  });
});

describe('offerMove', () => {
  it('places the offer over a selection nobody is holding a pointer on', () => {
    expect(offerMove({ selected: true, pointerHeld: false })).toEqual({ kind: 'place' });
  });

  it('takes the offer away the moment the selection collapses', () => {
    expect(offerMove({ selected: false, pointerHeld: false })).toEqual({ kind: 'clear' });
  });

  it('takes the offer away for a collapsed selection even under a held pointer', () => {
    expect(offerMove({ selected: false, pointerHeld: true })).toEqual({ kind: 'clear' });
  });

  it('leaves the offer where it is while a pointer is still down', () => {
    expect(offerMove({ selected: true, pointerHeld: true })).toEqual({ kind: 'keep' });
  });
});

describe('liftMetrics', () => {
  it('reads the size and the gap from the pixels the lift tokens compute to', () => {
    const tokens: Readonly<Record<string, string>> = { '--lift-size': '44px', '--lift-gap': '8px' };
    const style = { getPropertyValue: (property: string) => tokens[property] ?? '' };

    expect(liftMetrics(style)).toEqual({ size: 44, gap: 8 });
  });
});

describe('liftSpot', () => {
  it('places the lift over a chapter rect moved onto the stage, above it when there is room', () => {
    const spot = liftSpot(
      [rect(110, 360, 270, 390)],
      { x: -10, y: 0 },
      { left: 0, top: 60, width: 414, height: 896 },
      LIFT,
    );

    expect(spot).toEqual({ left: centred(100, 260), top: 300 - LIFT.gap - LIFT.size });
  });

  it('places the lift below a selection against the top of the stage', () => {
    const spot = liftSpot(
      [rect(100, 4, 260, 34)],
      HOST_VIEWPORT_ORIGIN,
      { left: 0, top: 0, width: 414, height: 896 },
      LIFT,
    );

    expect(spot).toEqual({ left: centred(100, 260), top: 34 + LIFT.gap });
  });

  it('measures the stage by the height it is given', () => {
    const spot = liftSpot(
      [rect(100, 4, 260, 34)],
      HOST_VIEWPORT_ORIGIN,
      { left: 0, top: 0, width: 414, height: 60 },
      LIFT,
    );

    expect(spot).toEqual({ left: centred(100, 260), top: 60 - LIFT.size });
  });

  it('offers no spot for a selection off the stage', () => {
    const spot = liftSpot(
      [rect(100, 300, 260, 330)],
      FRAME_NOWHERE_ON_THE_STAGE,
      { left: 0, top: 0, width: 414, height: 896 },
      LIFT,
    );

    expect(spot).toBeNull();
  });
});
