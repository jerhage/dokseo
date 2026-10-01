import { match } from 'ts-pattern';
import type { Anchor, SoughtPassage } from '$lib/shared/anchor';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import type { ReaderArrival } from '$lib/shared/reader-location';
import { arrivalAt, passageArrivalAt, soughtPassage } from '../../domain/capture/capture-arrival';
import type { Arrival, ArrivalCapture } from '../../domain/capture/capture-arrival';
import type { PassageOrder } from '../../domain/capture/capture-order';

function arrivalFrom(
  read: readonly ArrivalCapture[],
  found: ReaderArrival,
  direction: ReadingDirection,
  passages: PassageOrder,
): Arrival<ArrivalCapture> | null {
  return match(found)
    .with({ kind: 'image' }, (image) =>
      image.region === null
        ? null
        : arrivalAt(
            read,
            image.query,
            direction,
            { index: image.index, rect: image.region },
            passages,
          ),
    )
    .with({ kind: 'passage' }, () => null)
    .with({ kind: 'none' }, () => null)
    .exhaustive();
}

function passageArrivalFrom(
  read: readonly ArrivalCapture[],
  found: ReaderArrival,
  order: PassageOrder,
): Arrival<ArrivalCapture> | null {
  return match(found)
    .with({ kind: 'passage' }, (passage) =>
      passageArrivalAt(read, passage.query, passage.cfi, order),
    )
    .with({ kind: 'image' }, () => null)
    .with({ kind: 'none' }, () => null)
    .exhaustive();
}

function passageFrom(anchors: readonly Anchor[], found: ReaderArrival): SoughtPassage | null {
  return match(found)
    .with({ kind: 'passage' }, (passage) => soughtPassage(anchors, passage.cfi))
    .with({ kind: 'image' }, () => null)
    .with({ kind: 'none' }, () => null)
    .exhaustive();
}

export { arrivalFrom, passageArrivalFrom, passageFrom };
