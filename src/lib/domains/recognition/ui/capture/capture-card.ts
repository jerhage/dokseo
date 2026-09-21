import type { CaptureOrigin } from '$lib/shared/capture-origin';

const NOTE_STATE = 'Note';

const READ_STATE = 'Read';

const EMPTY_NOTE = 'Write into this note.';

function captureState(origin: CaptureOrigin): string {
  return origin === 'written' ? NOTE_STATE : READ_STATE;
}

function captureNote(origin: CaptureOrigin, text: string): string | null {
  return origin === 'written' && text.length === 0 ? EMPTY_NOTE : null;
}

export { NOTE_STATE, READ_STATE, EMPTY_NOTE, captureState, captureNote };
