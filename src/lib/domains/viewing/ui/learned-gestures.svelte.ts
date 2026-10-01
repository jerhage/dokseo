import { rememberedSet } from '$lib/platform/storage/remembered-set';
import { RememberedChoice } from '$lib/shared/remembered-choice.svelte';
import { isReaderGesture } from './gesture-hint';
import type { ReaderGesture } from './gesture-hint';
import { readGestureHints, saveGestureHints } from './gesture-hints-setting';

const remembered = rememberedSet('reader.gestures.learned');

let learned = $state.raw<readonly ReaderGesture[]>(remembered.values().filter(isReaderGesture));

const wanted = new RememberedChoice<boolean>(readGestureHints, saveGestureHints);

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
  return wanted.value;
}

function chooseHints(on: boolean): void {
  if (on && !wanted.value) {
    forgetGestures();
  }
  wanted.choose(on);
}

export { chooseHints, forgetGestures, hintsWanted, learnedGestures, learnGesture };
