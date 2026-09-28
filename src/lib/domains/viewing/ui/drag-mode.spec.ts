import { describe, expect, it } from 'vitest';
import { SELECT_MODE_LABELS, dragOrigin } from './drag-mode';

describe('dragOrigin', () => {
  it('sends a drag to the recognizer while the note mode is off', () => {
    expect(dragOrigin(false)).toBe('recognized');
  });

  it('sends a drag to a written note while the note mode is on', () => {
    expect(dragOrigin(true)).toBe('written');
  });
});

describe('SELECT_MODE_LABELS', () => {
  it('says a one-finger selection replaces the page turn on paged books', () => {
    expect(SELECT_MODE_LABELS.paged).toBe('Select with one finger instead of turning pages');
  });

  it('says a one-finger selection replaces the scroll on a strip', () => {
    expect(SELECT_MODE_LABELS.continuous).toBe('Select with one finger instead of scrolling');
  });
});
