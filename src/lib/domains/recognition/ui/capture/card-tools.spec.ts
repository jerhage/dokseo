import { describe, expect, it } from 'vitest';
import { cardTools } from './card-tools';
import type { ToolCard } from './card-tools';

const READ: ToolCard = {
  origin: 'recognized',
  place: 'p.004',
  editable: true,
  noteLabel: 'Add a note to the capture at p.004',
  annotation: null,
  text: 'こっちに来て',
};

describe('cardTools', () => {
  it('offers to add a note when the capture has none', () => {
    expect(cardTools(READ).note).toEqual({
      kind: 'add',
      label: 'Add a note to the capture at p.004',
    });
  });

  it('offers to edit the note once the capture carries one', () => {
    const noted = {
      ...READ,
      noteLabel: 'Edit the note',
      annotation: 'a word to learn',
    };

    expect(cardTools(noted).note).toEqual({
      kind: 'edit',
      label: 'Edit the note',
    });
  });

  it('offers no note on a capture that takes none, such as a written note', () => {
    expect(cardTools({ ...READ, noteLabel: null }).note).toEqual({
      kind: 'none',
    });
  });

  it('shows the edit of a written note on the card, since its text is the note', () => {
    expect(cardTools({ ...READ, origin: 'written', noteLabel: null }).text).toEqual({
      kind: 'shown',
      label: 'Edit the note at p.004',
    });
  });

  it('shows the text edit of a recognised capture, whose reading may need fixing', () => {
    expect(cardTools(READ).text).toEqual({
      kind: 'shown',
      label: 'Edit the text of the capture at p.004',
    });
  });

  it('tucks the text edit of a lifted passage into the menu, since it is the book text', () => {
    expect(cardTools({ ...READ, origin: 'lifted' }).text.kind).toBe('tucked');
  });

  it('offers no text edit on a capture that cannot be edited', () => {
    expect(cardTools({ ...READ, editable: false }).text).toEqual({ kind: 'none' });
  });

  it('copies the trimmed text and offers no copy for a capture with no text', () => {
    expect(cardTools({ ...READ, text: '  こっちに来て\n' }).copies).toBe('こっちに来て');
    expect(cardTools({ ...READ, text: null }).copies).toBeNull();
    expect(cardTools({ ...READ, text: '   ' }).copies).toBeNull();
  });
});
