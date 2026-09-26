import { rememberedString } from '$lib/platform/storage/remembered-string';
import type { LocateStore } from '$lib/platform/storage/remembered-string';

const GESTURE_HINTS_KEY = 'reader.gestures.hints';

const GESTURE_HINTS_LABEL = 'Show gesture hints';

function toGestureHints(stored: string | null): boolean {
  return stored !== 'off';
}

function readGestureHints(locate?: LocateStore): boolean {
  return toGestureHints(rememberedString(GESTURE_HINTS_KEY, locate).read());
}

function saveGestureHints(wanted: boolean, locate?: LocateStore): void {
  rememberedString(GESTURE_HINTS_KEY, locate).write(wanted ? 'on' : 'off');
}

export {
  GESTURE_HINTS_KEY,
  GESTURE_HINTS_LABEL,
  readGestureHints,
  saveGestureHints,
  toGestureHints,
};
