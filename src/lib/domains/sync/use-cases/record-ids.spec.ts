import { describe, expect, it } from 'vitest';
import { bookMarkers } from '$lib/domains/library/domain/book/book-markers';
import { catalogMarker } from '$lib/domains/catalog/domain/catalog-marker';
import { captureMarker } from '$lib/domains/recognition/domain/capture/capture-marker';
import { tagMarker } from '$lib/domains/recognition/domain/tag/tag-marker';
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

  it('agrees with the record ids the leaf adapters write into the outbox', () => {
    const hash = contentHash('0123456789abcdef0123456789abcdef');
    const written = [
      ...bookMarkers(hash, false, 1),
      captureMarker(captureId('c'), false, 1),
      tagMarker(tagId('t'), false, 1),
      catalogMarker(catalogId('k'), false, 1),
    ];

    expect(written.map((marker) => [marker.kind, marker.recordId])).toEqual([
      ['book', bookRecordId({ contentHash: hash })],
      ['position', positionRecordId({ contentHash: hash })],
      ['capture', captureRecordId({ id: captureId('c') })],
      ['tag', tagRecordId({ id: tagId('t') })],
      ['catalog', catalogRecordId({ id: catalogId('k') })],
    ]);
  });
});
