import type { Capture } from '$lib/domains/recognition/domain/capture/capture';
import { regionAnchor } from '$lib/shared/anchor';
import { pageRect } from '$lib/shared/geometry';
import { bookId, captureId, contentHash, imageIndex } from '$lib/shared/ids';
import type { CapturesImportCounts } from '../use-cases/apply-captures-import';
import type { FileBook } from '../use-cases/captures-file';
import type {
  CaptureConflict,
  CapturesImportPlan,
  CapturesImportSummary,
} from '../use-cases/captures-import-plan';

const BOOK: FileBook = {
  key: 'book-1',
  contentHash: contentHash('0123456789abcdef0123456789abcdef'),
  fileName: 'volume-1.cbz',
  title: 'Volume 1',
  alias: null,
  seriesId: null,
  volume: null,
  language: 'ja',
  direction: 'rtl',
  layoutKind: 'paged',
  sourceKind: 'archive',
  imageCount: 100,
};

type RecognizedCapture = Extract<Capture, { readonly origin: 'recognized' }>;

function capture(id: string, fields: Partial<RecognizedCapture> = {}): RecognizedCapture {
  return {
    id: captureId(id),
    bookId: bookId('device-book'),
    anchor: regionAnchor([{ index: imageIndex(2), rect: pageRect(0.001, 0.002, 0.003, 0.004) }]),
    text: `device text of ${id}`,
    origin: 'recognized',
    confidence: null,
    note: `device note of ${id}`,
    createdAt: 100,
    editedAt: null,
    tagIds: [],
    ...fields,
  };
}

function conflict(id: string): CaptureConflict {
  const device = capture(id);
  return {
    id: device.id,
    book: BOOK,
    device,
    file: { ...device, text: `file text of ${id}`, editedAt: 200 },
    tagIds: [],
    onAnotherBook: false,
  };
}

const SUMMARY: CapturesImportSummary = {
  added: 1,
  identical: 0,
  tagsOnly: 0,
  conflicts: 2,
  onAnotherBook: 0,
  notOnThisDevice: { books: 0, captures: 0 },
  newTags: 0,
  unreadable: 0,
  droppedTags: 0,
  storedUnreadable: 0,
};

const FIRST = conflict('first');

const SECOND = conflict('second');

const PLAN: CapturesImportPlan = {
  books: [],
  records: [],
  tags: [],
  captures: [
    { kind: 'new', capture: capture('fresh'), onShelf: true },
    { kind: 'conflict', conflict: FIRST },
    { kind: 'conflict', conflict: SECOND },
  ],
  summary: SUMMARY,
  unreadable: [],
  droppedTags: [],
};

const COUNTS: CapturesImportCounts = { added: 1, updated: 1, kept: 1, held: 0, tagsCreated: 0 };

export { COUNTS, FIRST, PLAN, SECOND, capture };
