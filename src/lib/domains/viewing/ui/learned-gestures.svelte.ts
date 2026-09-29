import { rememberedSet } from '$lib/platform/storage/remembered-set';
import { isReaderGesture } from './gesture-hint';
import type { ReaderGesture } from './gesture-hint';
import { readGestureHints, saveGestureHints } from './gesture-hints-setting';

const remembered = rememberedSet('reader.gestures.learned');

let learned = $state.raw<readonly ReaderGesture[]>(remembered.values().filter(isReaderGesture));

let wanted = $state(readGestureHints());

function learnedGestures(): readonly ReaderGesture[] {
  return learned;
}

function learnGesture(gesture: ReaderGesture): void {
  if (learned.includes(gesture)) return;

  learned = remembered.add(gesture).filter(isReaderGesture);
}

function forgetGestures(): void {
  learned = remembered.clear().filter(isReaderGesture);
}

function hintsWanted(): boolean {
  return wanted;
}

function chooseHints(on: boolean): void {
  if (on && !wanted) {
    forgetGestures();
  }
  wanted = on;
  saveGestureHints(on);
}

export { chooseHints, forgetGestures, hintsWanted, learnedGestures, learnGesture };
