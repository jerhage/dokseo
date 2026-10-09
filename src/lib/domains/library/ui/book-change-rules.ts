import { match } from 'ts-pattern';
import type { Notice } from '$lib/shared/notice';
import { shownTitle } from '$lib/shared/shown-title';
import type { Book } from '../domain/book/book';
import type { BookMerge } from '../domain/book/book-merge';
import { describeLibraryRefusal } from '../queries/library-error-text';
import type { BookMark } from '../queries/library-queries';
import { onShelf } from './library-shelves';
import type { Shelf } from './library-shelves';

const EDIT_FAILED = 'Could not save the book settings';

const REMOVE_FAILED = 'Could not remove that book';

const CAPTURES_LEFT = 'Removed that book, but not all of its captures';

const CAPTURES_LEFT_ADVICE = 'It is listed under Removed books, where Delete captures finishes it.';

const MERGE_FAILED = 'Could not merge that book';

const MERGED_ADVICE = 'Its captures were moved onto it.';

const MERGE_LEFT = 'Moved its captures, but could not clear the unreadable book';

const MERGE_LEFT_ADVICE = 'Merge it again to finish.';

const FINISH_FAILED = 'Could not mark that book finished';

const UNREAD_FAILED = 'Could not mark that book unread';

const UNDO_MARK_FAILED = 'Could not undo that change';

function markedTitle(mark: BookMark, book: Book): string {
  return mark === 'finished'
    ? `Marked ${shownTitle(book)} finished`
    : `Marked ${shownTitle(book)} unread`;
}

function undoOffer(
  mark: BookMark,
  before: Book | undefined,
  marked: Book,
  shelf: Shelf,
): string | null {
  if (before === undefined) return null;
  if (!onShelf(before, shelf) || onShelf(marked, shelf)) return null;
  return markedTitle(mark, marked);
}

function mergeNotice(merged: BookMerge, into: Book): Notice {
  return match(merged)
    .returnType<Notice>()
    .with({ kind: 'merged' }, () => ({
      tone: 'success',
      title: `Merged into ${shownTitle(into)}`,
      message: MERGED_ADVICE,
    }))
    .with({ kind: 'partly-merged' }, () => ({
      tone: 'warning',
      title: MERGE_LEFT,
      message: MERGE_LEFT_ADVICE,
    }))
    .with({ kind: 'storage-unavailable' }, (refusal) => ({
      tone: 'danger',
      title: MERGE_FAILED,
      message: describeLibraryRefusal(refusal),
    }))
    .exhaustive();
}

function markFailedTitle(mark: BookMark): string {
  return mark === 'finished' ? FINISH_FAILED : UNREAD_FAILED;
}

export {
  CAPTURES_LEFT,
  CAPTURES_LEFT_ADVICE,
  EDIT_FAILED,
  FINISH_FAILED,
  MERGED_ADVICE,
  MERGE_FAILED,
  MERGE_LEFT,
  MERGE_LEFT_ADVICE,
  REMOVE_FAILED,
  UNDO_MARK_FAILED,
  UNREAD_FAILED,
  markFailedTitle,
  mergeNotice,
  undoOffer,
};
