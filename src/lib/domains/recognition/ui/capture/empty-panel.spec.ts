import { describe, expect, it } from 'vitest';
import { emptyPanelText } from './empty-panel';

describe('emptyPanelText', () => {
  it('invites a box drawn over a speech bubble in the image reader', () => {
    expect(emptyPanelText('images', false)).toBe(
      'Drag a box over a speech bubble and the text arrives here.',
    );
  });

  it('invites a selection saved with the pencil in the ebook reader', () => {
    expect(emptyPanelText('text', false)).toBe(
      'Select some text and press the pencil to save it here.',
    );
  });

  it.each(['images', 'text'] as const)(
    'reports the same search miss in the %s reader',
    (source) => {
      expect(emptyPanelText(source, true)).toBe('No capture or note in this book holds that text.');
    },
  );
});
