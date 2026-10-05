import { describe, expect, it } from 'vitest';
import { markedSegments } from './marked-segments';

describe('markedSegments', () => {
  it('marks every match of the query in any case and keeps the text between them', () => {
    expect(markedSegments('Harbour lights on the harbour wall', 'HARBOUR')).toEqual([
      { text: 'Harbour', matched: true },
      { text: ' lights on the ', matched: false },
      { text: 'harbour', matched: true },
      { text: ' wall', matched: false },
    ]);
  });

  it('leaves the whole text unmarked for a blank query', () => {
    expect(markedSegments('Harbour wall', '  ')).toEqual([
      { text: 'Harbour wall', matched: false },
    ]);
  });

  it('reads the characters of a pattern in the query as plain text', () => {
    expect(markedSegments('a.b and axb', 'a.b')).toEqual([
      { text: 'a.b', matched: true },
      { text: ' and axb', matched: false },
    ]);
  });

  it('returns no segment for an empty text', () => {
    expect(markedSegments('', 'harbour')).toEqual([]);
  });
});
