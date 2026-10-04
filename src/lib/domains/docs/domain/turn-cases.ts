import { shownTurnSettings } from '$lib/shared/turn-settings';
import type { ShownTurnSettings } from '$lib/shared/turn-settings';
import { runCheck } from './spec-runner';
import type { CheckOutcome } from './spec-runner';

type TurnQuery = '(any-pointer: coarse)' | '(any-pointer: fine)' | '(any-hover: hover)';

type TurnCase = {
  readonly name: string;
  readonly matching: readonly TurnQuery[];
  readonly expected: ShownTurnSettings;
};

const TURN_QUERIES: readonly TurnQuery[] = [
  '(any-pointer: coarse)',
  '(any-pointer: fine)',
  '(any-hover: hover)',
];

const TOUCH_ONLY: ShownTurnSettings = { touchTurns: true, edgeClicks: false };
const MOUSE_ONLY: ShownTurnSettings = { touchTurns: false, edgeClicks: true };
const BOTH: ShownTurnSettings = { touchTurns: true, edgeClicks: true };

const TURN_CASES: readonly TurnCase[] = [
  { name: 'a phone', matching: ['(any-pointer: coarse)'], expected: TOUCH_ONLY },
  {
    name: 'a touch-only iPad that expects an Apple Pencil',
    matching: ['(any-pointer: coarse)', '(any-pointer: fine)'],
    expected: TOUCH_ONLY,
  },
  {
    name: 'an iPad with a trackpad',
    matching: ['(any-pointer: coarse)', '(any-pointer: fine)', '(any-hover: hover)'],
    expected: BOTH,
  },
  {
    name: 'a desktop with a mouse',
    matching: ['(any-pointer: fine)', '(any-hover: hover)'],
    expected: MOUSE_ONLY,
  },
  {
    name: 'a laptop with a touch screen and a trackpad',
    matching: ['(any-pointer: coarse)', '(any-pointer: fine)', '(any-hover: hover)'],
    expected: BOTH,
  },
  {
    name: 'a device that reports no pointer',
    matching: [],
    expected: { touchTurns: false, edgeClicks: false },
  },
];

function checkTurnCase(turnCase: TurnCase): CheckOutcome {
  return runCheck(
    () => shownTurnSettings((query) => turnCase.matching.some((matched) => matched === query)),
    turnCase.expected,
  );
}

function settingsText(settings: ShownTurnSettings): string {
  const shown = [
    ...(settings.touchTurns ? ['touch turns'] : []),
    ...(settings.edgeClicks ? ['edge clicks'] : []),
  ];
  return shown.length === 0 ? 'neither' : shown.join(' and ');
}

export { TURN_CASES, TURN_QUERIES, checkTurnCase, settingsText };
export type { TurnCase, TurnQuery };
