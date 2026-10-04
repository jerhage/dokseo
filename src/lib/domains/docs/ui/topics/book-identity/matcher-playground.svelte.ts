import { match } from 'ts-pattern';
import type { BookMatching } from '$lib/domains/library/domain/book/book-matching';
import { matchOutcome } from './identity-demos';
import type {
  DescribedUpload,
  Holding,
  HoldingKind,
  MatchOutcome,
  MatchStep,
} from './identity-demos';

type EditableHolding = {
  id: string;
  kind: HoldingKind;
  title: string;
  fileName: string;
  contentHash: string;
};

type EditableUpload = {
  contentHash: string;
  fileName: string;
  title: string;
  fileTitle: string;
};

type UploadPreset = {
  readonly label: string;
  readonly upload: DescribedUpload;
};

const YOTSUBA_HASH = '6f1c0e9b2d4a8e73c5b1f09a7d3e2c48';

const AKIRA_HASH = 'b84d2a7e91c0f356de18a4b7c9e05f21';

const LEGACY_HASH = '9a3fe1c27b6d4058a1e93c7f2b6d8e40c5a19f3e7d2b6084e1c57a9d3f0b2e6c';

const STARTING_HOLDINGS: readonly EditableHolding[] = [
  {
    id: 'book-1',
    kind: 'shelf',
    title: 'Yotsuba 01',
    fileName: 'Yotsuba 01.cbz',
    contentHash: YOTSUBA_HASH,
  },
  {
    id: 'book-2',
    kind: 'removed',
    title: 'Akira Vol. 1',
    fileName: 'Akira_v01.pdf',
    contentHash: AKIRA_HASH,
  },
  {
    id: 'book-3',
    kind: 'unreadable',
    title: 'Yotsuba 01',
    fileName: '',
    contentHash: LEGACY_HASH,
  },
  {
    id: 'book-4',
    kind: 'removed',
    title: 'Untitled book',
    fileName: 'scan.pdf',
    contentHash: 'c0ffee12ab34cd56ef7890ab12cd34ef',
  },
];

const SAME_FILE: UploadPreset = {
  label: 'Yotsuba 01.cbz again',
  upload: {
    contentHash: YOTSUBA_HASH,
    fileName: 'Yotsuba 01.cbz',
    title: 'Yotsuba 01',
    fileTitle: 'Yotsuba 01',
  },
};

const UPLOAD_PRESETS: readonly UploadPreset[] = [
  SAME_FILE,
  {
    label: 'Yotsuba 01.cbz, re-zipped',
    upload: {
      contentHash: '0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a',
      fileName: 'Yotsuba 01.cbz',
      title: 'Yotsuba 01',
      fileTitle: 'Yotsuba 01',
    },
  },
  {
    label: 'Akira, renamed',
    upload: {
      contentHash: AKIRA_HASH,
      fileName: 'akira 1.pdf',
      title: 'Akira Vol. 1',
      fileTitle: 'akira 1',
    },
  },
  {
    label: 'Akira, another scan',
    upload: {
      contentHash: '5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
      fileName: 'Akira_v01.pdf',
      title: 'Akira_v01',
      fileTitle: 'Akira_v01',
    },
  },
  {
    label: 'Akira, new scan and name',
    upload: {
      contentHash: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
      fileName: 'AKIRA (1988) 01.pdf',
      title: 'Akira Vol. 1',
      fileTitle: 'AKIRA (1988) 01',
    },
  },
  {
    label: 'A book never seen',
    upload: {
      contentHash: 'e3b0c44298fc1c149afbf4c8996fb924',
      fileName: 'Nausicaa 1.epub',
      title: 'Nausicaä of the Valley of the Wind 1',
      fileTitle: 'Nausicaa 1',
    },
  },
];

type Verdict = {
  readonly variant: 'info' | 'success';
  readonly title: string;
  readonly body: string;
};

type RowMark = 'joined' | 'merged' | 'restored';

function stepText(step: MatchStep): string {
  return match(step)
    .with('content', () => 'step 1, the same hash')
    .with('file-name', () => 'step 2, the same file name')
    .with('title', () => 'step 3, the same title')
    .exhaustive();
}

function nameOf(holding: Holding): string {
  return holding.title.trim().length > 0 ? holding.title : holding.id;
}

function joinText(join: 'by-content' | 'by-name'): string {
  return join === 'by-content'
    ? 'Its hash equals the hash of this shelf book.'
    : 'Matching by file name, its name equals the name of this shelf book.';
}

function mergeText(merged: readonly Holding[]): string {
  if (merged.length === 0) return 'No unreadable row matches that book.';
  return `Merged into it: ${merged.map(nameOf).join(', ')}. Their captures move onto the shelf book.`;
}

function verdictOf(outcome: MatchOutcome): Verdict {
  return match(outcome)
    .returnType<Verdict>()
    .with({ kind: 'already-held' }, ({ join, holding, merged }) => ({
      variant: 'info',
      title: `Already held: ${nameOf(holding)}`,
      body: `${joinText(join)} Nothing new is stored. ${mergeText(merged)}`,
    }))
    .with({ kind: 'restored' }, ({ holding, step }) => ({
      variant: 'success',
      title: `Restored: ${nameOf(holding)}`,
      body: `No shelf book matched. This ${holding.kind === 'unreadable' ? 'unreadable row' : 'removed record'} matched at ${stepText(step)}. The new book takes its id, ${holding.id}, so its captures attach again.`,
    }))
    .with({ kind: 'added' }, () => ({
      variant: 'info',
      title: 'Added as a new book',
      body: 'Nothing matched at any step, so the book gets a new id and no captures.',
    }))
    .exhaustive();
}

function outcomeMarks(outcome: MatchOutcome): ReadonlyMap<string, RowMark> {
  return match(outcome)
    .returnType<ReadonlyMap<string, RowMark>>()
    .with({ kind: 'already-held' }, ({ holding, merged }) => {
      const marks = new Map<string, RowMark>([[holding.id, 'joined']]);
      for (const row of merged) marks.set(row.id, 'merged');
      return marks;
    })
    .with({ kind: 'restored' }, ({ holding }) => new Map([[holding.id, 'restored' as const]]))
    .with({ kind: 'added' }, () => new Map())
    .exhaustive();
}

function copied(holding: EditableHolding): EditableHolding {
  return { ...holding };
}

class MatcherPlayground {
  holdings = $state<EditableHolding[]>(STARTING_HOLDINGS.map(copied));
  upload = $state<EditableUpload>({ ...SAME_FILE.upload });
  matching = $state<BookMatching>('content');
  #next = STARTING_HOLDINGS.length + 1;

  readonly ranked: readonly Holding[] = $derived(
    this.holdings.map((holding, index) => ({ ...holding, addedAt: index + 1 })),
  );

  readonly outcome: MatchOutcome = $derived(
    matchOutcome(this.ranked, { ...this.upload }, this.matching),
  );

  addHolding(kind: HoldingKind): void {
    this.holdings.push({
      id: `book-${this.#next}`,
      kind,
      title: '',
      fileName: '',
      contentHash: '',
    });
    this.#next += 1;
  }

  removeHolding(id: string): void {
    this.holdings = this.holdings.filter((holding) => holding.id !== id);
  }

  usePreset(preset: UploadPreset): void {
    this.upload = { ...preset.upload };
  }
}

export { MatcherPlayground, STARTING_HOLDINGS, UPLOAD_PRESETS, outcomeMarks, verdictOf };
export type { EditableHolding, EditableUpload, RowMark, UploadPreset, Verdict };
