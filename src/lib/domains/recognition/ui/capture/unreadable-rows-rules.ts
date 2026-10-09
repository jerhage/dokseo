import { match } from 'ts-pattern';
import type { FileToSave, SaveFileOutcome } from '$lib/platform/files/save-file';
import { ANOTHER_TAP_PROMPT } from '$lib/shared/book-captures-export-rules';
import type { ExportOffer } from '$lib/shared/book-captures-export-rules';

type UnreadableRowsFile = {
  readonly file: FileToSave;
  readonly captures: number;
  readonly tags: number;
};

type UnreadableRowsFileBuilt =
  | { readonly kind: 'success'; readonly exported: UnreadableRowsFile }
  | { readonly kind: 'nothing-to-export' };

type UnreadableRowsSaveState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'saving' }
  | { readonly kind: 'needs-another-tap' }
  | { readonly kind: 'saved'; readonly exported: UnreadableRowsFile };

const IDLE: UnreadableRowsSaveState = { kind: 'idle' };

const NO_OFFER: ExportOffer = { kind: 'none' };

function counted(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function savedRowsText(exported: UnreadableRowsFile): string {
  if (exported.tags === 0) {
    return `Saved ${counted(exported.captures, 'unreadable capture', 'unreadable captures')}.`;
  }
  if (exported.captures === 0) {
    return `Saved ${counted(exported.tags, 'unreadable tag', 'unreadable tags')}.`;
  }
  return `Saved ${counted(exported.captures + exported.tags, 'unreadable row', 'unreadable rows')}.`;
}

function unreadableRowsOffer(
  state: UnreadableRowsSaveState,
  built: UnreadableRowsFileBuilt,
): ExportOffer {
  if (built.kind === 'nothing-to-export') return NO_OFFER;
  return match(state)
    .returnType<ExportOffer>()
    .with({ kind: 'idle' }, () => ({ kind: 'export', busy: false, confirmation: null }))
    .with({ kind: 'saving' }, () => ({ kind: 'export', busy: true, confirmation: null }))
    .with({ kind: 'needs-another-tap' }, () => ({
      kind: 'another-tap',
      prompt: ANOTHER_TAP_PROMPT,
    }))
    .with({ kind: 'saved' }, ({ exported }) => ({
      kind: 'export',
      busy: false,
      confirmation: savedRowsText(exported),
    }))
    .exhaustive();
}

function settledState(
  outcome: SaveFileOutcome,
  exported: UnreadableRowsFile,
): UnreadableRowsSaveState {
  return match(outcome)
    .returnType<UnreadableRowsSaveState>()
    .with({ kind: 'shared' }, { kind: 'downloaded' }, () => ({ kind: 'saved', exported }))
    .with({ kind: 'cancelled' }, () => IDLE)
    .with({ kind: 'needs-another-tap' }, () => ({ kind: 'needs-another-tap' }))
    .exhaustive();
}

export { IDLE, savedRowsText, settledState, unreadableRowsOffer };
export type { UnreadableRowsFile, UnreadableRowsFileBuilt, UnreadableRowsSaveState };
