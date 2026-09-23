import { match } from 'ts-pattern';
import type { CaptureOrigin } from '$lib/shared/capture-origin';

const NOTE_STATE = 'Note';

const READ_STATE = 'Read';

const LIFTED_STATE = 'Lifted';

const EMPTY_NOTE = 'Write into this note.';

function captureState(origin: CaptureOrigin): string {
  return match(origin)
    .with('written', () => NOTE_STATE)
    .with('recognized', () => READ_STATE)
    .with('lifted', () => LIFTED_STATE)
    .exhaustive();
}

function captureNote(origin: CaptureOrigin, text: string): string | null {
  return match(origin)
    .with('written', () => (text.length === 0 ? EMPTY_NOTE : null))
    .with('recognized', () => null)
    .with('lifted', () => null)
    .exhaustive();
}

export { NOTE_STATE, READ_STATE, LIFTED_STATE, EMPTY_NOTE, captureState, captureNote };
