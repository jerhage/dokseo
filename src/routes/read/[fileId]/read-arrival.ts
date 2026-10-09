import { comparePassages } from '$lib/domains/flowing/ui/flow-passage-order';
import {
  arrivalFrom,
  passageArrivalFrom,
  passageFrom,
} from '$lib/domains/recognition/ui/capture/capture-arrivals';
import { arrivalGlow, everyOtherGlow } from '$lib/domains/recognition/ui/capture/capture-glow';
import type { Anchor } from '$lib/shared/anchor';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import type { ReaderArrival } from '$lib/shared/reader-location';

type ArrivalRead = Parameters<typeof arrivalFrom>[0];

function imageArrivalOf(read: ArrivalRead, found: ReaderArrival, direction: ReadingDirection) {
  const here = arrivalFrom(read, found, direction, comparePassages);
  return {
    glow: arrivalGlow(here),
    everyGlow: everyOtherGlow(read, here),
    stepping: here?.stepping ?? null,
  };
}

function passageArrivalOf(read: ArrivalRead, anchors: readonly Anchor[], found: ReaderArrival) {
  return {
    passage: passageFrom(anchors, found),
    stepping: passageArrivalFrom(read, found, comparePassages)?.stepping ?? null,
  };
}

export { imageArrivalOf, passageArrivalOf };
