type CaptureSource = 'images' | 'text';

const SEARCH_MISS_TEXT = 'No capture or note in this book holds that text.';

const IMAGE_INVITE_TEXT = 'Drag a box over a speech bubble and the text arrives here.';

const TEXT_INVITE_TEXT = 'Select some text and press the pencil to save it here.';

function emptyPanelText(source: CaptureSource, searching: boolean): string {
  if (searching) return SEARCH_MISS_TEXT;

  return source === 'images' ? IMAGE_INVITE_TEXT : TEXT_INVITE_TEXT;
}

export { emptyPanelText };
export type { CaptureSource };
