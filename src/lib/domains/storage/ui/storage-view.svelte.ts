import type { Container } from '$lib/container';
import { megabytes, storedSize } from '$lib/shared/bytes';
import { describeCause } from '$lib/shared/cause';
import type { OriginStoresError } from '../domain/origin-stores';
import type { StorageAccount, StoragePart } from '../domain/storage-parts';

const UNMEASURABLE = 'not measurable';

function failureNote(error: OriginStoresError): string {
  return `What this app stores could not be read: ${error.cause}`;
}

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

class StorageSettingsView {
  account = $state.raw<StorageAccount | null>(null);
  message = $state.raw<string | null>(null);

  #container: Container;
  #generation = 0;

  constructor(container: Container) {
    this.#container = container;
  }

  async load(): Promise<void> {
    const generation = this.#bump();

    try {
      const read = await this.#container.storage.readStorageAccount();
      if (generation !== this.#generation) return;

      if (read.ok) {
        this.account = read.value;
        this.message = null;
      } else {
        this.account = null;
        this.message = failureNote(read.error);
      }
    } catch (cause) {
      if (generation !== this.#generation) return;
      this.account = null;
      this.message = `What this app stores could not be read: ${describeCause(cause)}`;
    }
  }

  dispose(): void {
    this.#bump();
  }

  #bump(): number {
    this.#generation += 1;
    return this.#generation;
  }
}

export {
  failureNote,
  partFigure,
  measuredFigure,
  originFigure,
  unnamedFigure,
  unnamedNote,
  allowanceNote,
  persistenceNote,
  StorageSettingsView,
};
