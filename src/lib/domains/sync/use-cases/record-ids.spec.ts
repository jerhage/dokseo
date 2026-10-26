import { describe, expect, it } from 'vitest';
import { captureId, catalogId, contentHash, tagId } from '$lib/shared/ids';
import {
  bookRecordId,
  captureRecordId,
  catalogRecordId,
  positionRecordId,
  tagRecordId,
} from './record-ids';

describe('record ids', () => {
  it('names a book and its position by the content hash and the rest by their own id', () => {
    const hash = contentHash('0123456789abcdef0123456789abcdef');
    expect(bookRecordId({ contentHash: hash })).toBe(hash);
    expect(positionRecordId({ contentHash: hash })).toBe(hash);
    expect(captureRecordId({ id: captureId('c') })).toBe('c');
    expect(tagRecordId({ id: tagId('t') })).toBe('t');
    expect(catalogRecordId({ id: catalogId('k') })).toBe('k');
  });
});
