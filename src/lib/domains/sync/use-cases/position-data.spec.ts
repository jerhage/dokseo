import { describe, expect, it } from 'vitest';
import { imageIndex } from '$lib/shared/ids';
import { imagePlace, samePlace, textPlace } from '$lib/shared/reading-place';
import { contractExamples } from './contract-examples';
import { fromSyncPositionData, toSyncPositionData } from './position-data';

describe('position record data', () => {
  it('reads every valid contract example as a position', () => {
    for (const { name, value } of contractExamples('valid', 'position')) {
      expect(fromSyncPositionData(value).kind, name).toBe('success');
    }
  });

  it('reports every invalid contract example as unreadable', () => {
    for (const { name, value } of contractExamples('invalid', 'position')) {
      expect(fromSyncPositionData(value).kind, name).toBe('unreadable');
    }
  });

  it('writes the fields of its kind and reads each kind of place back unchanged', () => {
    const places = [
      imagePlace(imageIndex(12), imageIndex(13), 0.4),
      textPlace('epubcfi(/6/8!/4/2/1:0)', 0.31),
    ];
    for (const position of places) {
      const book = { position, lastReadAt: 1772446000000, finishedAt: null };
      const data = toSyncPositionData(book);
      expect(Object.keys(data)).toEqual(
        position.kind === 'image'
          ? ['kind', 'index', 'shownThrough', 'offset', 'lastReadAt', 'finishedAt']
          : ['kind', 'cfi', 'fraction', 'lastReadAt', 'finishedAt'],
      );
      const read = fromSyncPositionData(data);
      if (read.kind !== 'success') throw new Error(read.reason);
      expect(samePlace(read.position.place, position)).toBe(true);
      expect(read.position.lastReadAt).toBe(1772446000000);
      expect(read.position.finishedAt).toBeNull();
    }
  });

  it('reads a position without its read times as null times', () => {
    const read = fromSyncPositionData({ kind: 'image', index: 1, shownThrough: 1, offset: 0 });
    expect(read).toMatchObject({
      kind: 'success',
      position: { lastReadAt: null, finishedAt: null },
    });
  });
});
