import type { CaptureOrigin } from '$lib/shared/capture-origin';

const NOTE_MODE_LABEL = 'Write a note instead of reading the selection';

const SELECT_MODE_LABEL = 'Select with one finger instead of turning pages';

function dragOrigin(noting: boolean): CaptureOrigin {
  return noting ? 'written' : 'recognized';
}

export { NOTE_MODE_LABEL, SELECT_MODE_LABEL, dragOrigin };
