import { SIDE_ZONE_SHARE } from '$lib/shared/page-turn';
import type { TapZone, TouchTurns } from '$lib/shared/page-turn';
import { runCheck, testVerdict } from './spec-runner';
import type { CheckOutcome, TestVerdict } from './spec-runner';

type MutantKey =
  | 'original'
  | 'left-or-equal'
  | 'right-or-equal'
  | 'left-flipped'
  | 'variant-flipped'
  | 'guard-and'
  | 'positive-or-zero'
  | 'share-flipped';

type Operators = {
  readonly positive: (value: number) => boolean;
  readonly swipeOnly: (turns: TouchTurns) => boolean;
  readonly unusable: (xIsFinite: boolean, widthIsPositive: boolean) => boolean;
  readonly share: number;
  readonly left: (x: number, side: number) => boolean;
  readonly right: (x: number, edge: number) => boolean;
};

type Mutant = {
  readonly key: MutantKey;
  readonly label: string;
  readonly from: string;
  readonly to: string;
  readonly appTestsFailing: number;
  readonly appSpecFiles: number;
};

type ZoneCheck = {
  readonly x: number;
  readonly width: number;
  readonly turns: TouchTurns;
  readonly zone: TapZone;
};

type ZoneTest = {
  readonly name: string;
  readonly quote: string;
  readonly checks: readonly ZoneCheck[];
};

type ZoneTestRun = {
  readonly test: ZoneTest;
  readonly outcomes: readonly CheckOutcome[];
  readonly verdict: TestVerdict;
};

const PHONE_WIDTH = 390;

const ORIGINAL: Operators = {
  positive: (value) => Number.isFinite(value) && value > 0,
  swipeOnly: (turns) => turns === 'swipe-only',
  unusable: (xIsFinite, widthIsPositive) => !xIsFinite || !widthIsPositive,
  share: SIDE_ZONE_SHARE,
  left: (x, side) => x < side,
  right: (x, edge) => x > edge,
};

const OPERATORS: Readonly<Record<MutantKey, Operators>> = {
  original: ORIGINAL,
  'left-or-equal': { ...ORIGINAL, left: (x, side) => x <= side },
  'right-or-equal': { ...ORIGINAL, right: (x, edge) => x >= edge },
  'left-flipped': { ...ORIGINAL, left: (x, side) => x > side },
  'variant-flipped': { ...ORIGINAL, swipeOnly: (turns) => turns !== 'swipe-only' },
  'guard-and': {
    ...ORIGINAL,
    unusable: (xIsFinite, widthIsPositive) => !xIsFinite && !widthIsPositive,
  },
  'positive-or-zero': { ...ORIGINAL, positive: (value) => Number.isFinite(value) && value >= 0 },
  'share-flipped': { ...ORIGINAL, share: 1 - SIDE_ZONE_SHARE },
};

const TAP_ZONE_SOURCE = `function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function tapZone(x: number, frameWidth: number, turns: TouchTurns): TapZone {
  if (turns === 'swipe-only') return 'centre';
  if (!Number.isFinite(x) || !isPositiveFinite(frameWidth)) return 'centre';

  const side = frameWidth * SIDE_ZONE_SHARE;
  if (x < side) return 'left';
  if (x > frameWidth - side) return 'right';

  return 'centre';
}`;

const MUTANTS: readonly Mutant[] = [
  {
    key: 'original',
    label: 'No change',
    from: '',
    to: '',
    appTestsFailing: 0,
    appSpecFiles: 0,
  },
  {
    key: 'left-or-equal',
    label: 'x < side becomes x <= side',
    from: "if (x < side) return 'left';",
    to: "if (x <= side) return 'left';",
    appTestsFailing: 0,
    appSpecFiles: 0,
  },
  {
    key: 'right-or-equal',
    label: '> becomes >= on the right edge',
    from: "if (x > frameWidth - side) return 'right';",
    to: "if (x >= frameWidth - side) return 'right';",
    appTestsFailing: 0,
    appSpecFiles: 0,
  },
  {
    key: 'left-flipped',
    label: 'x < side becomes x > side',
    from: "if (x < side) return 'left';",
    to: "if (x > side) return 'left';",
    appTestsFailing: 21,
    appSpecFiles: 6,
  },
  {
    key: 'variant-flipped',
    label: '=== becomes !== on the variant',
    from: "if (turns === 'swipe-only') return 'centre';",
    to: "if (turns !== 'swipe-only') return 'centre';",
    appTestsFailing: 23,
    appSpecFiles: 6,
  },
  {
    key: 'guard-and',
    label: '|| becomes && in the guard',
    from: "if (!Number.isFinite(x) || !isPositiveFinite(frameWidth)) return 'centre';",
    to: "if (!Number.isFinite(x) && !isPositiveFinite(frameWidth)) return 'centre';",
    appTestsFailing: 1,
    appSpecFiles: 1,
  },
  {
    key: 'positive-or-zero',
    label: 'value > 0 becomes value >= 0',
    from: 'return Number.isFinite(value) && value > 0;',
    to: 'return Number.isFinite(value) && value >= 0;',
    appTestsFailing: 2,
    appSpecFiles: 1,
  },
  {
    key: 'share-flipped',
    label: 'the 30% share becomes 70%',
    from: 'const side = frameWidth * SIDE_ZONE_SHARE;',
    to: 'const side = frameWidth * (1 - SIDE_ZONE_SHARE);',
    appTestsFailing: 10,
    appSpecFiles: 4,
  },
];

function check(
  x: number,
  zone: TapZone,
  turns: TouchTurns = 'tap-zones',
  width = PHONE_WIDTH,
): ZoneCheck {
  return { x, width, turns, zone };
}

const ZONE_TESTS: readonly ZoneTest[] = [
  {
    name: 'splits the frame thirty, forty, thirty in the tap-zones variant',
    quote: "expect(tapZone(118, PHONE_WIDTH, 'tap-zones')).toBe('centre');",
    checks: [
      check(0, 'left'),
      check(116, 'left'),
      check(118, 'centre'),
      check(195, 'centre'),
      check(272, 'centre'),
      check(274, 'right'),
      check(PHONE_WIDTH, 'right'),
    ],
  },
  {
    name: 'answers the centre everywhere in the swipe-only variant, so a tap never turns',
    quote: 'for (const x of [0, 10, 116, 195, 274, 380, PHONE_WIDTH]) {',
    checks: [0, 10, 116, 195, 274, 380, PHONE_WIDTH].map((x) => check(x, 'centre', 'swipe-only')),
  },
  {
    name: 'answers the centre for a frame it cannot divide',
    quote: "expect(tapZone(10, -390, 'tap-zones')).toBe('centre');",
    checks: [
      check(10, 'centre', 'tap-zones', 0),
      check(10, 'centre', 'tap-zones', -390),
      check(10, 'centre', 'tap-zones', Number.NaN),
      check(Number.NaN, 'centre'),
    ],
  },
];

function mutantTapZone(
  key: MutantKey,
): (x: number, frameWidth: number, turns: TouchTurns) => TapZone {
  const operators = OPERATORS[key];
  return (x, frameWidth, turns) => {
    if (operators.swipeOnly(turns)) return 'centre';
    if (operators.unusable(Number.isFinite(x), operators.positive(frameWidth))) return 'centre';

    const side = frameWidth * operators.share;
    if (operators.left(x, side)) return 'left';
    if (operators.right(x, frameWidth - side)) return 'right';

    return 'centre';
  };
}

function mutantSource(mutant: Mutant): string {
  return mutant.from === '' ? TAP_ZONE_SOURCE : TAP_ZONE_SOURCE.replace(mutant.from, mutant.to);
}

function runZoneTests(key: MutantKey): readonly ZoneTestRun[] {
  const zone = mutantTapZone(key);
  return ZONE_TESTS.map((test) => {
    const outcomes = test.checks.map((zoneCheck) =>
      runCheck(() => zone(zoneCheck.x, zoneCheck.width, zoneCheck.turns), zoneCheck.zone),
    );
    return { test, outcomes, verdict: testVerdict(outcomes) };
  });
}

function checkText(zoneCheck: ZoneCheck): string {
  const width = zoneCheck.width === PHONE_WIDTH ? 'PHONE_WIDTH' : String(zoneCheck.width);
  const x = zoneCheck.x === PHONE_WIDTH ? 'PHONE_WIDTH' : String(zoneCheck.x);
  return `tapZone(${x}, ${width}, '${zoneCheck.turns}')`;
}

export {
  MUTANTS,
  PHONE_WIDTH,
  TAP_ZONE_SOURCE,
  ZONE_TESTS,
  checkText,
  mutantSource,
  mutantTapZone,
  runZoneTests,
};
export type { Mutant, MutantKey, ZoneCheck, ZoneTest, ZoneTestRun };
