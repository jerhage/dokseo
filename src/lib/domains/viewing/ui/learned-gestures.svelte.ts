import { rememberedSet } from '$lib/platform/storage/remembered-set';
import { isReaderGesture } from './gesture-hint';
import type { ReaderGesture } from './gesture-hint';

const remembered = rememberedSet('reader.gestures.learned');

let learned = $state.raw<readonly ReaderGesture[]>(remembered.values().filter(isReaderGesture));

function learnedGestures(): readonly ReaderGesture[] {
  return learned;
}

function learnGesture(gesture: ReaderGesture): void {
  if (learned.includes(gesture)) return;

  learned = remembered.add(gesture).filter(isReaderGesture);
}

export { learnedGestures, learnGesture };
