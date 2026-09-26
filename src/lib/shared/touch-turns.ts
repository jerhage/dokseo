import { rememberedString } from '$lib/platform/storage/remembered-string';
import type { LocateStore } from '$lib/platform/storage/remembered-string';
import type { TouchTurns } from '$lib/shared/page-turn';

type TouchTurnsChoice = { readonly value: TouchTurns; readonly label: string };

const TOUCH_TURNS_KEY = 'reader.touch.turns';

const TOUCH_TURNS_LEGEND = 'Page turns';

const TOUCH_TURNS_CHOICES: readonly TouchTurnsChoice[] = [
  { value: 'tap-zones', label: 'Tap zones and swipe' },
  { value: 'swipe-only', label: 'Swipe only' },
];

function toTouchTurns(stored: string | null): TouchTurns {
  return TOUCH_TURNS_CHOICES.find((choice) => choice.value === stored)?.value ?? 'swipe-only';
}

function readTouchTurns(locate?: LocateStore): TouchTurns {
  return toTouchTurns(rememberedString(TOUCH_TURNS_KEY, locate).read());
}

function saveTouchTurns(turns: TouchTurns, locate?: LocateStore): void {
  rememberedString(TOUCH_TURNS_KEY, locate).write(turns);
}

export {
  TOUCH_TURNS_CHOICES,
  TOUCH_TURNS_KEY,
  TOUCH_TURNS_LEGEND,
  readTouchTurns,
  saveTouchTurns,
  toTouchTurns,
};
export type { TouchTurnsChoice };
