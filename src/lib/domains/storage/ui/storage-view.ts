import { megabytes, storedSize } from '$lib/shared/bytes';
import type { StorageAccount, StoragePart } from '../domain/storage-parts';

const UNMEASURABLE = 'not measurable';

function partFigure(part: StoragePart): string {
  return part.bytes === null ? UNMEASURABLE : storedSize(part.bytes);
}

function measuredFigure(account: StorageAccount): string {
  return storedSize(account.measured);
}

function originFigure(account: StorageAccount): string | null {
  return account.usage === null ? null : storedSize(account.usage);
}

function unnamedFigure(account: StorageAccount): string | null {
  const remainder = account.remainder;
  if (remainder === null) return null;

  return remainder < 0 ? `−${storedSize(-remainder)}` : storedSize(remainder);
}

function unnamedNote(account: StorageAccount): string | null {
  const remainder = account.remainder;
  if (remainder === null) return null;

  if (remainder < 0) {
    return 'the parts above come to more than the browser reports, whose figure is rounded';
  }
  if (remainder === 0) return 'every byte the browser counts is named above';

  const vague = account.unmeasured.length;
  if (vague === 0) return 'bytes this app cannot name';

  const parts = vague === 1 ? 'the part' : `the ${vague} parts`;
  return `bytes this app cannot name, including ${parts} above that cannot be measured`;
}

function allowanceNote(account: StorageAccount): string | null {
  return account.quota === null
    ? null
    : `The browser allows this app about ${megabytes(account.quota)} MB here.`;
}

function persistenceNote(account: StorageAccount): string {
  return account.persisted
    ? 'The browser has granted persistence, so it will not reclaim this space on its own.'
    : 'The browser has not granted persistence, so it may reclaim this space on its own.';
}

export {
  partFigure,
  measuredFigure,
  originFigure,
  unnamedFigure,
  unnamedNote,
  allowanceNote,
  persistenceNote,
};
