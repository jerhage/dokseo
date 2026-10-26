import type { Book } from '$lib/domains/library/domain/book/book';
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

export { bookRecordId, captureRecordId, positionRecordId, tagRecordId };
