import { match } from 'ts-pattern';

type PointerKinds = 'touch' | 'fine' | 'touch-and-fine' | 'neither';

type ShownTurnSettings = {
  readonly touchTurns: boolean;
  readonly edgeClicks: boolean;
};

function pointerKinds(coarse: boolean, fine: boolean): PointerKinds {
  if (coarse && fine) return 'touch-and-fine';
  if (coarse) return 'touch';
  if (fine) return 'fine';

  return 'neither';
}

function shownTurnSettings(coarse: boolean, fine: boolean): ShownTurnSettings {
  return match(pointerKinds(coarse, fine))
    .with('touch', () => ({ touchTurns: true, edgeClicks: false }))
    .with('fine', () => ({ touchTurns: false, edgeClicks: true }))
    .with('touch-and-fine', () => ({ touchTurns: true, edgeClicks: true }))
    .with('neither', () => ({ touchTurns: false, edgeClicks: false }))
    .exhaustive();
}

export { pointerKinds, shownTurnSettings };
export type { PointerKinds, ShownTurnSettings };
