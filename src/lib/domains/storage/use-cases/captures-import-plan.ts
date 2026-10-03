import { match } from 'ts-pattern';
import type { Book } from '$lib/domains/library/domain/book/book';
import { restorableMatch, shelfMatch } from '$lib/domains/library/domain/book/book-matching';
import type {
  MatchProbe,
  RestorableCandidates,
} from '$lib/domains/library/domain/book/book-matching';
import type { RemovedBook } from '$lib/domains/library/domain/book/removed-book';
import type { Capture } from '$lib/domains/recognition/domain/capture/capture';
import { sameTagName } from '$lib/domains/recognition/domain/tag/tag';
import type { Tag } from '$lib/domains/recognition/domain/tag/tag';
import { bookId, tagId } from '$lib/shared/ids';
import type { BookId, CaptureId, TagId } from '$lib/shared/ids';
import type { BooklessCapture, FileBook } from './captures-file';
import type {
  DroppedTag,
  ReadCapture,
  ReadCapturesFileResult,
  UnreadableEntry,
} from './read-captures-file';

type ReadCapturesFile = Extract<ReadCapturesFileResult, { readonly kind: 'read' }>;

type LocalHoldings = {
  readonly shelf: readonly Book[];
  readonly restorable: RestorableCandidates<RemovedBook>;
  readonly tags: readonly Tag[];
  readonly unreadableTagIds: readonly TagId[];
  readonly captures: readonly Capture[];
};

type PlanMinting = {
  readonly newId: () => string;
  readonly now: () => number;
};

type BookMatch =
  | { readonly kind: 'shelf'; readonly book: Book }
  | { readonly kind: 'restorable'; readonly book: RemovedBook }
  | { readonly kind: 'absent'; readonly record: RemovedBook };

type PlannedBook = { readonly file: FileBook; readonly match: BookMatch };

type PlannedTag =
  | { readonly kind: 'merged'; readonly file: Tag; readonly into: Tag }
  | { readonly kind: 'created'; readonly file: Tag; readonly tag: Tag };

type CaptureConflict = {
  readonly id: CaptureId;
  readonly book: FileBook;
  readonly device: Capture;
  readonly file: Capture;
  readonly tagIds: readonly TagId[];
  readonly onAnotherBook: boolean;
};

type PlannedCapture =
  | { readonly kind: 'new'; readonly capture: Capture; readonly onShelf: boolean }
  | { readonly kind: 'identical'; readonly id: CaptureId; readonly onAnotherBook: boolean }
  | { readonly kind: 'tags-only'; readonly capture: Capture; readonly onAnotherBook: boolean }
  | { readonly kind: 'conflict'; readonly conflict: CaptureConflict };

type NotOnThisDevice = { readonly books: number; readonly captures: number };

type CapturesImportSummary = {
  readonly added: number;
  readonly identical: number;
  readonly tagsOnly: number;
  readonly conflicts: number;
  readonly onAnotherBook: number;
  readonly notOnThisDevice: NotOnThisDevice;
  readonly newTags: number;
  readonly unreadable: number;
  readonly droppedTags: number;
};

type CapturesImportPlan = {
  readonly books: readonly PlannedBook[];
  readonly records: readonly RemovedBook[];
  readonly tags: readonly PlannedTag[];
  readonly captures: readonly PlannedCapture[];
  readonly summary: CapturesImportSummary;
  readonly unreadable: readonly UnreadableEntry[];
  readonly droppedTags: readonly DroppedTag[];
};

type CaptureTarget = {
  readonly id: BookId;
  readonly book: FileBook;
  readonly onShelf: boolean;
};

function probeOf(file: FileBook): MatchProbe {
  return {
    contentHash: file.contentHash,
    fileName: file.fileName,
    title: file.title,
    fileTitle: '',
  };
}

function absentRecord(file: FileBook, minting: PlanMinting): RemovedBook {
  return {
    id: bookId(minting.newId()),
    title: file.title,
    alias: file.alias,
    contentHash: file.contentHash,
    fileName: file.fileName,
    language: file.language,
    direction: file.direction,
    addedAt: minting.now(),
  };
}

function bookMatch(file: FileBook, holdings: LocalHoldings, minting: PlanMinting): BookMatch {
  const probe = probeOf(file);
  const onShelf = shelfMatch(holdings.shelf, probe);
  if (onShelf !== null) return { kind: 'shelf', book: onShelf };
  const restorable = restorableMatch(holdings.restorable, probe);
  if (restorable !== null) return { kind: 'restorable', book: restorable };
  return { kind: 'absent', record: absentRecord(file, minting) };
}

function targetOf(planned: PlannedBook): CaptureTarget {
  return match(planned.match)
    .returnType<CaptureTarget>()
    .with({ kind: 'shelf' }, ({ book }) => ({ id: book.id, book: planned.file, onShelf: true }))
    .with({ kind: 'restorable' }, ({ book }) => ({
      id: book.id,
      book: planned.file,
      onShelf: false,
    }))
    .with({ kind: 'absent' }, ({ record }) => ({
      id: record.id,
      book: planned.file,
      onShelf: false,
    }))
    .exhaustive();
}

function planTags(
  fileTags: readonly Tag[],
  holdings: LocalHoldings,
  minting: PlanMinting,
): readonly PlannedTag[] {
  const known: Tag[] = [...holdings.tags];
  const taken = new Set<TagId>([
    ...holdings.tags.map((tag) => tag.id),
    ...holdings.unreadableTagIds,
  ]);
  return fileTags.map((file): PlannedTag => {
    const into = known.find((tag) => sameTagName(tag.name, file.name));
    if (into !== undefined) return { kind: 'merged', file, into };
    const tag: Tag = { ...file, id: taken.has(file.id) ? tagId(minting.newId()) : file.id };
    known.push(tag);
    taken.add(tag.id);
    return { kind: 'created', file, tag };
  });
}

function tagMapping(tags: readonly PlannedTag[]): ReadonlyMap<TagId, TagId> {
  return new Map(
    tags.map((planned) =>
      match(planned)
        .returnType<[TagId, TagId]>()
        .with({ kind: 'merged' }, ({ file, into }) => [file.id, into.id])
        .with({ kind: 'created' }, ({ file, tag }) => [file.id, tag.id])
        .exhaustive(),
    ),
  );
}

function tagUnion(first: readonly TagId[], second: readonly TagId[]): readonly TagId[] {
  return [...new Set([...first, ...second])];
}

function remapped(tagIds: readonly TagId[], mapping: ReadonlyMap<TagId, TagId>): readonly TagId[] {
  return tagUnion(
    [],
    tagIds.flatMap((id) => {
      const mapped = mapping.get(id);
      return mapped === undefined ? [] : [mapped];
    }),
  );
}

function placed(capture: BooklessCapture, book: BookId, tagIds: readonly TagId[]): Capture {
  return { ...capture, bookId: book, tagIds };
}

function noteOf(capture: BooklessCapture): string | null {
  return 'note' in capture ? capture.note : null;
}

function sameContent(device: Capture, file: BooklessCapture): boolean {
  return device.text === file.text && noteOf(device) === noteOf(file);
}

function planCapture(
  entry: ReadCapture,
  target: CaptureTarget,
  held: ReadonlyMap<CaptureId, Capture>,
  mapping: ReadonlyMap<TagId, TagId>,
): PlannedCapture {
  const fileTags = remapped(entry.capture.tagIds, mapping);
  const device = held.get(entry.capture.id);
  if (device === undefined) {
    return {
      kind: 'new',
      capture: placed(entry.capture, target.id, fileTags),
      onShelf: target.onShelf,
    };
  }

  const onAnotherBook = device.bookId !== target.id;
  const tagIds = tagUnion(device.tagIds, fileTags);
  if (!sameContent(device, entry.capture)) {
    const file = placed(entry.capture, device.bookId, fileTags);
    return {
      kind: 'conflict',
      conflict: { id: device.id, book: target.book, device, file, tagIds, onAnotherBook },
    };
  }
  if (tagIds.length === device.tagIds.length) {
    return { kind: 'identical', id: device.id, onAnotherBook };
  }
  return { kind: 'tags-only', capture: { ...device, tagIds }, onAnotherBook };
}

function isOnAnotherBook(planned: PlannedCapture): boolean {
  return match(planned)
    .with({ kind: 'new' }, () => false)
    .with({ kind: 'identical' }, { kind: 'tags-only' }, ({ onAnotherBook }) => onAnotherBook)
    .with({ kind: 'conflict' }, ({ conflict }) => conflict.onAnotherBook)
    .exhaustive();
}

function heldAway(captures: readonly PlannedCapture[]): readonly Capture[] {
  return captures.flatMap((planned) =>
    planned.kind === 'new' && !planned.onShelf ? [planned.capture] : [],
  );
}

function recordsToAdd(
  books: readonly PlannedBook[],
  captures: readonly PlannedCapture[],
): readonly RemovedBook[] {
  const holding = new Set(heldAway(captures).map((capture) => capture.bookId));
  const records = new Map<BookId, RemovedBook>();
  for (const planned of books) {
    if (planned.match.kind !== 'absent') continue;
    const { record } = planned.match;
    if (holding.has(record.id)) records.set(record.id, record);
  }
  return [...records.values()];
}

function countOf(captures: readonly PlannedCapture[], kind: PlannedCapture['kind']): number {
  return captures.filter((planned) => planned.kind === kind).length;
}

function summaryOf(
  read: ReadCapturesFile,
  tags: readonly PlannedTag[],
  captures: readonly PlannedCapture[],
): CapturesImportSummary {
  const away = heldAway(captures);
  return {
    added: countOf(captures, 'new'),
    identical: countOf(captures, 'identical'),
    tagsOnly: countOf(captures, 'tags-only'),
    conflicts: countOf(captures, 'conflict'),
    onAnotherBook: captures.filter(isOnAnotherBook).length,
    notOnThisDevice: {
      books: new Set(away.map((capture) => capture.bookId)).size,
      captures: away.length,
    },
    newTags: tags.filter((planned) => planned.kind === 'created').length,
    unreadable: read.unreadable.length,
    droppedTags: read.droppedTags.length,
  };
}

function planCapturesImport(
  read: ReadCapturesFile,
  holdings: LocalHoldings,
  minting: PlanMinting,
): CapturesImportPlan {
  const books = read.books.map((file) => ({ file, match: bookMatch(file, holdings, minting) }));
  const targets = new Map(books.map((planned) => [planned.file.key, targetOf(planned)]));
  const tags = planTags(read.tags, holdings, minting);
  const mapping = tagMapping(tags);
  const held = new Map(holdings.captures.map((capture) => [capture.id, capture]));
  const captures = read.captures.flatMap((entry) => {
    const target = targets.get(entry.book.key);
    return target === undefined ? [] : [planCapture(entry, target, held, mapping)];
  });

  return {
    books,
    records: recordsToAdd(books, captures),
    tags,
    captures,
    summary: summaryOf(read, tags, captures),
    unreadable: read.unreadable,
    droppedTags: read.droppedTags,
  };
}

export { planCapturesImport };
export type {
  BookMatch,
  CaptureConflict,
  CapturesImportPlan,
  CapturesImportSummary,
  LocalHoldings,
  NotOnThisDevice,
  PlanMinting,
  PlannedBook,
  PlannedCapture,
  PlannedTag,
  ReadCapturesFile,
};
