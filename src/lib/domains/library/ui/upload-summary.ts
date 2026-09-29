import { match } from 'ts-pattern';
import type { Notice } from '$lib/shared/notice';

type UploadTally = {
  readonly added: number;
  readonly held: number;
  readonly failures: readonly string[];
};

type KeptBooks =
  | { readonly kind: 'none' }
  | { readonly kind: 'added'; readonly added: number }
  | { readonly kind: 'held'; readonly held: number }
  | { readonly kind: 'added-and-held'; readonly added: number; readonly held: number };

function bookCount(count: number): string {
  return count === 1 ? '1 book' : `${count.toLocaleString()} books`;
}

function keptBooks(tally: UploadTally): KeptBooks {
  if (tally.added > 0 && tally.held > 0) {
    return { kind: 'added-and-held', added: tally.added, held: tally.held };
  }
  if (tally.added > 0) return { kind: 'added', added: tally.added };
  if (tally.held > 0) return { kind: 'held', held: tally.held };
  return { kind: 'none' };
}

function keptText(kept: KeptBooks): string | null {
  return match(kept)
    .with({ kind: 'none' }, () => null)
    .with({ kind: 'added' }, ({ added }) => `Added ${bookCount(added)}`)
    .with({ kind: 'held' }, ({ held }) => `${bookCount(held)} already in your library`)
    .with(
      { kind: 'added-and-held' },
      ({ added, held }) =>
        `Added ${bookCount(added)}, ${held.toLocaleString()} already in your library`,
    )
    .exhaustive();
}

function keptNotice(kept: KeptBooks): Notice | null {
  const title = keptText(kept);
  if (title === null) return null;
  return { tone: kept.kind === 'held' ? 'info' : 'success', title };
}

function uploadSummary(tally: UploadTally): Notice | null {
  const kept = keptBooks(tally);
  const failed = tally.failures.length;
  if (failed === 0) return keptNotice(kept);

  const total = tally.added + tally.held + failed;
  const lead = keptText(kept);
  return {
    tone: 'danger',
    title: `Could not add ${failed.toLocaleString()} of ${total.toLocaleString()} books`,
    message: [...(lead === null ? [] : [lead]), ...tally.failures].join(' · '),
  };
}

export { uploadSummary };
export type { UploadTally };
