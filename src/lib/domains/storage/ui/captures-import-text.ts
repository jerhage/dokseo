import { match } from 'ts-pattern';
import type { StatusVariant } from '$lib/ui/components/classes';
import type { Capture } from '$lib/domains/recognition/domain/capture/capture';
import type { CapturesImportCounts } from '../use-cases/apply-captures-import';
import type { CapturesImportSummary } from '../use-cases/captures-import-plan';
import type { FileSection, UnreadableEntry } from '../use-cases/read-captures-file';
import type { CapturesImportState, ConflictStrategy } from './captures-import.svelte';

type ImportStatus = {
  readonly variant: StatusVariant;
  readonly message: string;
  readonly notes: readonly string[];
};

type PreviewRow = {
  readonly title: string;
  readonly description: string | undefined;
  readonly value: string;
};

type StrategyOption = {
  readonly strategy: ConflictStrategy;
  readonly label: string;
  readonly hint: string;
};

const STRATEGY_OPTIONS: readonly StrategyOption[] = [
  {
    strategy: 'newer',
    label: 'Keep the newer edit',
    hint: 'Each capture keeps whichever version was edited last.',
  },
  {
    strategy: 'this-device',
    label: "Keep this device's version",
    hint: 'The file only adds what is new.',
  },
  {
    strategy: 'review',
    label: 'Review all',
    hint: 'Choose for each capture.',
  },
];

const ENTRY_NAMES: Readonly<Record<FileSection, string>> = {
  books: 'Book',
  tags: 'Tag',
  captures: 'Capture',
};

function counted(count: number, one: string, many: string): string {
  return `${count.toLocaleString()} ${count === 1 ? one : many}`;
}

function nothingToWrite(summary: CapturesImportSummary): boolean {
  return summary.added + summary.tagsOnly + summary.conflicts + summary.newTags === 0;
}

type CountedRow = { readonly count: number; readonly title: string; readonly description?: string };

function previewRows(summary: CapturesImportSummary): readonly PreviewRow[] {
  const rows: readonly CountedRow[] = [
    { count: summary.added, title: 'New captures' },
    {
      count: summary.identical + summary.tagsOnly,
      title: 'Already here',
      ...(summary.tagsOnly === 0
        ? {}
        : { description: `${counted(summary.tagsOnly, 'gains', 'gain')} tags from the file.` }),
    },
    {
      count: summary.conflicts,
      title: 'Conflicts',
      description: 'The same capture, with a different text or note here.',
    },
    {
      count: summary.notOnThisDevice.captures,
      title: 'For books not on this device',
      description:
        'Part of the new captures. They wait in Removed books until you upload the book.',
    },
    { count: summary.newTags, title: 'New tags' },
    { count: summary.unreadable, title: 'Could not be read' },
    {
      count: summary.storedUnreadable,
      title: 'Unreadable rows kept in the file',
      description: 'Not imported. The file keeps them as they were stored.',
    },
  ];
  return rows
    .filter((row) => row.count > 0)
    .map((row) => ({
      title: row.title,
      description: row.description,
      value: row.count.toLocaleString(),
    }));
}

function fileDetail(detail: string): string {
  return detail.replace(/^A stored \w+ /u, '');
}

function unreadableLine(entry: UnreadableEntry): string {
  const name = `${ENTRY_NAMES[entry.section]} ${entry.index + 1}`;
  return match(entry.reason)
    .with({ kind: 'invalid' }, ({ detail }) => `${name} ${fileDetail(detail)}.`)
    .with({ kind: 'repeated' }, () => `${name} repeats an earlier entry.`)
    .with({ kind: 'unknown-book' }, () => `${name} names a book the file does not hold.`)
    .exhaustive();
}

function unreadableLines(
  unreadable: readonly UnreadableEntry[],
  droppedTags: number,
): readonly string[] {
  const missing =
    droppedTags === 0
      ? []
      : [
          `${counted(droppedTags, 'tag named on a capture is', 'tags named on captures are')} missing from the file and left off.`,
        ];
  return [...unreadable.map(unreadableLine), ...missing];
}

function importedNotes(counts: CapturesImportCounts): readonly string[] {
  return [
    counts.added === 0 ? null : `Added ${counted(counts.added, 'capture', 'captures')}.`,
    counts.updated === 0 ? null : `Updated ${counted(counts.updated, 'capture', 'captures')}.`,
    counts.kept === 0
      ? null
      : `Kept this device's version of ${counted(counts.kept, 'capture', 'captures')}.`,
    counts.held === 0
      ? null
      : `${counted(counts.held, 'capture waits', 'captures wait')} in Removed books until you upload the book.`,
    counts.tagsCreated === 0 ? null : `Created ${counted(counts.tagsCreated, 'tag', 'tags')}.`,
  ].filter((note) => note !== null);
}

function importStatus(state: CapturesImportState): ImportStatus | null {
  return match(state)
    .returnType<ImportStatus | null>()
    .with(
      { kind: 'idle' },
      { kind: 'reading' },
      { kind: 'preview' },
      { kind: 'reviewing' },
      { kind: 'importing' },
      () => null,
    )
    .with({ kind: 'not-an-export' }, () => ({
      variant: 'warning',
      message: 'This file is not a captures export.',
      notes: [],
    }))
    .with({ kind: 'newer-version' }, () => ({
      variant: 'warning',
      message:
        'This file comes from a newer version of the app. Update the app, then import it again.',
      notes: [],
    }))
    .with({ kind: 'storage-unavailable' }, () => ({
      variant: 'warning',
      message: 'This browser blocks local storage, so captures cannot be imported.',
      notes: [],
    }))
    .with({ kind: 'imported' }, ({ counts }) => {
      const notes = importedNotes(counts);
      return {
        variant: 'success',
        message: notes.length === 0 ? 'Import finished. Nothing changed.' : 'Import finished.',
        notes,
      };
    })
    .exhaustive();
}

function versionLabel(capture: Capture, format: (at: number) => string): string {
  return capture.editedAt === null
    ? `Captured ${format(capture.createdAt)}`
    : `Edited ${format(capture.editedAt)}`;
}

export {
  STRATEGY_OPTIONS,
  importStatus,
  importedNotes,
  nothingToWrite,
  previewRows,
  unreadableLines,
  versionLabel,
};
export type { ImportStatus, PreviewRow, StrategyOption };
