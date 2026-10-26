import { describe, expect, it } from 'vitest';
import type { Capture } from '$lib/domains/recognition/domain/capture/capture';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import { pageRect } from '$lib/shared/geometry';
import { bookId, captureId, contentHash, imageIndex, tagId } from '$lib/shared/ids';
import { fromSyncCaptureData, placedCapture, toSyncCaptureData } from './capture-data';
import { contractExamples, schemaKeys } from './contract-examples';

const ID = captureId('00000000-0000-4000-8000-000000000001');
const KEY = contentHash('0123456789abcdef0123456789abcdef');
const BOOK = bookId('device-local-id');

const BASE = {
  id: ID,
  bookId: BOOK,
  text: 'よつば',
  createdAt: 1772445700000,
  editedAt: null,
  tagIds: [tagId('00000000-0000-4000-8000-000000000005')],
};

const REGION = regionAnchor([{ index: imageIndex(4), rect: pageRect(0.1, 0.2, 0.3, 0.25) }]);

const TEXT = textAnchor(
  'epubcfi(/6/8!/4/2/1:0)',
  { exact: '吾輩は猫である', prefix: '', suffix: '。' },
  null,
);

const CAPTURES: readonly Capture[] = [
  { ...BASE, anchor: REGION, origin: 'recognized', note: null, confidence: 0.93 },
  { ...BASE, anchor: REGION, origin: 'written' },
  { ...BASE, anchor: TEXT, origin: 'lifted', note: 'opening line' },
];

describe('capture record data', () => {
  it('reads every valid contract example as a capture of its book key', () => {
    for (const { name, value } of contractExamples('valid', 'capture')) {
      const read = fromSyncCaptureData(value, ID);
      expect(read.kind, name).toBe('success');
    }
  });

  it('reports every invalid contract example as unreadable', () => {
    for (const { name, value } of contractExamples('invalid', 'capture')) {
      expect(fromSyncCaptureData(value, ID).kind, name).toBe('unreadable');
    }
  });

  it('names the book by its key and carries neither the capture id nor the book id', () => {
    const { properties } = schemaKeys('capture');
    for (const capture of CAPTURES) {
      const data = toSyncCaptureData(capture, KEY);
      expect(data.bookKey).toBe(KEY);
      expect(Object.keys(data).filter((key) => !properties.includes(key))).toEqual([]);
    }
  });

  it('reads each origin back unchanged and returns the key for the caller to resolve', () => {
    for (const capture of CAPTURES) {
      const read = fromSyncCaptureData(toSyncCaptureData(capture, KEY), ID);
      if (read.kind !== 'success') throw new Error(read.reason);
      expect(read.bookKey).toBe(KEY);
      expect(placedCapture(read.capture, BOOK)).toEqual(capture);
    }
  });
});
