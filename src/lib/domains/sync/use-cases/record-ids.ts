import type { Book } from '$lib/domains/library/domain/book/book';
import type { Catalog } from '$lib/domains/catalog/domain/catalog';
import type { Capture } from '$lib/domains/recognition/domain/capture/capture';
import type { Tag } from '$lib/domains/recognition/domain/tag/tag';

function bookRecordId(book: Pick<Book, 'contentHash'>): string {
  return book.contentHash;
}

function positionRecordId(book: Pick<Book, 'contentHash'>): string {
  return book.contentHash;
}

function captureRecordId(capture: Pick<Capture, 'id'>): string {
  return capture.id;
}

function tagRecordId(tag: Pick<Tag, 'id'>): string {
  return tag.id;
}

function catalogRecordId(catalog: Pick<Catalog, 'id'>): string {
  return catalog.id;
}

export { bookRecordId, captureRecordId, catalogRecordId, positionRecordId, tagRecordId };
