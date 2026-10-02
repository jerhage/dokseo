import { describe, expect, it } from 'vitest';
import { SELECT_MODE_LABELS, dragOrigin } from './drag-mode';

describe('dragOrigin', () => {
  it.each([
    { noting: false, origin: 'recognized' },
    { noting: true, origin: 'written' },
  ])('sends a drag to $origin when the note mode is $noting', ({ noting, origin }) => {
    expect(dragOrigin(noting)).toBe(origin);
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
