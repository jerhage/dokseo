import { match } from 'ts-pattern';
import { arrivedAt, markAfterMove } from './flow-highlight';
import type { PassageMark } from './flow-highlight';
import type { MoveCause } from './flow-move';

type Arriving = { readonly kind: 'arriving'; readonly cfi: string };

type ArrivalStanding =
  | { readonly kind: 'none' }
  | Arriving
  | { readonly kind: 'landed'; readonly mark: PassageMark };

const NOT_STANDING: ArrivalStanding = { kind: 'none' };

function arrivingAt(cfi: string): Arriving {
  return { kind: 'arriving', cfi };
}

function landedFrom(mark: PassageMark): ArrivalStanding {
  return mark.kind === 'none' ? NOT_STANDING : { kind: 'landed', mark };
}

function landedAt(cfi: string, place: string | null): ArrivalStanding {
  return landedFrom(arrivedAt(cfi, place));
}

function standingAfterMove(
  standing: ArrivalStanding,
  place: string,
  cause: MoveCause,
): ArrivalStanding {
  return match(standing)
    .with({ kind: 'none' }, () => standing)
    .with({ kind: 'arriving' }, () => standing)
    .with({ kind: 'landed' }, (landed) => {
      const moved = markAfterMove(landed.mark, place, cause);
      return moved === landed.mark ? standing : landedFrom(moved);
    })
    .exhaustive();
}

function standingHolds(standing: ArrivalStanding): boolean {
  return match(standing)
    .with({ kind: 'none' }, () => false)
    .with({ kind: 'arriving' }, () => true)
    .with({ kind: 'landed' }, () => true)
    .exhaustive();
}

export { NOT_STANDING, arrivingAt, landedAt, standingAfterMove, standingHolds };
export type { ArrivalStanding, Arriving };
