import type { CaptureOrigin } from '$lib/shared/capture-origin';
import type { ImageLayoutKind } from '$lib/shared/layout-kind';

const NOTE_MODE_LABEL = 'Write a note instead of reading the selection';

const SELECT_MODE_LABELS: Readonly<Record<ImageLayoutKind, string>> = {
  paged: 'Select with one finger instead of turning pages',
  continuous: 'Select with one finger instead of scrolling',
};

function dragOrigin(noting: boolean): CaptureOrigin {
  return noting ? 'written' : 'recognized';
}

export { NOTE_MODE_LABEL, SELECT_MODE_LABELS, dragOrigin };
