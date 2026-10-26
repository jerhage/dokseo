import { changeMarker } from '$lib/shared/change-marker';
import type { ChangeMarker } from '$lib/shared/change-marker';
import { isText } from '$lib/shared/corrupt-row';
import type { Book, BookEdit } from './book';

const IDENTITY_EDIT_FIELDS: readonly (keyof BookEdit)[] = [
  'alias',
  'seriesId',
  'volume',
  'language',
  'layoutKind',
  'direction',
];

const POSITION_EDIT_FIELDS: readonly (keyof BookEdit)[] = ['position', 'lastReadAt', 'finishedAt'];

function bookMarkers(hash: string, deleted: boolean, at: number): readonly ChangeMarker[] {
  return [changeMarker('book', hash, deleted, at), changeMarker('position', hash, deleted, at)];
}

function heldBookMarkers(hash: unknown, deleted: boolean, at: number): readonly ChangeMarker[] {
  return isText(hash) ? bookMarkers(hash, deleted, at) : [];
}

function editMarkers(book: Pick<Book, 'contentHash'>, edit: BookEdit, at: number): ChangeMarker[] {
  const touches = (fields: readonly (keyof BookEdit)[]) =>
    fields.some((field) => edit[field] !== undefined);
  const markers: ChangeMarker[] = [];
  if (touches(IDENTITY_EDIT_FIELDS)) {
    markers.push(changeMarker('book', book.contentHash, false, at));
  }
  if (touches(POSITION_EDIT_FIELDS)) {
    markers.push(changeMarker('position', book.contentHash, false, at));
  }
  return markers;
}

function replacementMarkers(
  book: Pick<Book, 'contentHash'>,
  previousHash: unknown,
  at: number,
): readonly ChangeMarker[] {
  const added = bookMarkers(book.contentHash, false, at);
  if (previousHash === book.contentHash) return added;
  return [...heldBookMarkers(previousHash, true, at), ...added];
}

export { bookMarkers, editMarkers, heldBookMarkers, replacementMarkers };
