import { describe, expect, it } from 'vitest';
import { noteLines, plainSegments } from './note-lines';

describe('noteLines', () => {
  it('keeps a note with no line break as one line', () => {
    expect(noteLines(plainSegments('one line'))).toEqual([[{ text: 'one line', matched: false }]]);
  });

  it('breaks a note at each newline, keeping an empty line between paragraphs', () => {
    expect(noteLines(plainSegments('first\n\nthird'))).toEqual([
      [{ text: 'first', matched: false }],
      [],
      [{ text: 'third', matched: false }],
    ]);
  });

  it('keeps a match marked on both sides of a break inside it', () => {
    const lines = noteLines([
      { text: 'see ', matched: false },
      { text: 'ab\ncd', matched: true },
      { text: ' here', matched: false },
    ]);

    expect(lines).toEqual([
      [
        { text: 'see ', matched: false },
        { text: 'ab', matched: true },
      ],
      [
        { text: 'cd', matched: true },
        { text: ' here', matched: false },
      ],
    ]);
  });
});
