import type { CaptureOrigin } from '$lib/shared/capture-origin';

const NOTE_MODE_LABEL = 'Write a note instead of reading the selection';

function dragOrigin(noting: boolean): CaptureOrigin {
  return noting ? 'written' : 'recognized';
}

export { NOTE_MODE_LABEL, dragOrigin };
