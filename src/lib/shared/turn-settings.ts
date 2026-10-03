import { match } from 'ts-pattern';

type PointerKinds = 'touch' | 'mouse' | 'touch-and-mouse' | 'neither';

type MediaMatches = (query: string) => boolean;

type ShownTurnSettings = {
  readonly touchTurns: boolean;
  readonly edgeClicks: boolean;
};

const TOUCH_POINTER_QUERY = '(any-pointer: coarse)';
const MOUSE_POINTER_QUERY = '(any-hover: hover)';

function pointerKinds(matches: MediaMatches): PointerKinds {
  const touch = matches(TOUCH_POINTER_QUERY);
  const mouse = matches(MOUSE_POINTER_QUERY);
  if (touch && mouse) return 'touch-and-mouse';
  if (touch) return 'touch';
  if (mouse) return 'mouse';

  return 'neither';
}

function shownTurnSettings(matches: MediaMatches): ShownTurnSettings {
  return match(pointerKinds(matches))
    .with('touch', () => ({ touchTurns: true, edgeClicks: false }))
    .with('mouse', () => ({ touchTurns: false, edgeClicks: true }))
    .with('touch-and-mouse', () => ({ touchTurns: true, edgeClicks: true }))
    .with('neither', () => ({ touchTurns: false, edgeClicks: false }))
    .exhaustive();
}

export { pointerKinds, shownTurnSettings };
export type { MediaMatches, PointerKinds, ShownTurnSettings };
