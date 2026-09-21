import { describe, expect, it } from 'vitest';
import { dragOrigin } from './drag-mode';

describe('dragOrigin', () => {
  it('sends a drag to the recognizer while the note mode is off', () => {
    expect(dragOrigin(false)).toBe('recognized');
  });

  it('sends a drag to a written note while the note mode is on', () => {
    expect(dragOrigin(true)).toBe('written');
  });
});
