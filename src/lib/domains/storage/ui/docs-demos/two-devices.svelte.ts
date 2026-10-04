import type { Capture } from '$lib/domains/recognition/domain/capture/capture';
import type { Tag } from '$lib/domains/recognition/domain/tag/tag';
import { APP_VERSION } from '$lib/shared/app-version';
import { bookId, tagId } from '$lib/shared/ids';
import type { CaptureId } from '$lib/shared/ids';
import { applyCapturesImport } from '../../use-cases/apply-captures-import';
import { buildCapturesFile } from '../../use-cases/build-captures-file';
import { capturesFileName } from '../../use-cases/export-captures';
import { previewCapturesImport } from '../../use-cases/preview-captures-import';
import { CapturesImportView } from '../captures-import.svelte';
import type { ImportFile } from '../captures-import.svelte';
import {
  HARBOR,
  HARBOR_FIRST,
  HARBOR_SECOND,
  LANTERNS,
  LANTERN_FIRST,
  GRAMMAR,
  VOCAB,
  sampleCapture,
  sampleTime,
  withText,
} from './sample-holdings';
import type { Holdings } from './sample-holdings';
import { SimulatedDevice } from './simulated-device.svelte';
import type { DeviceName } from './simulated-device.svelte';

type Transfer = {
  readonly from: DeviceName;
  readonly to: DeviceName;
  readonly name: string;
  readonly json: string;
  readonly round: number;
};

const FIRST_MINUTE = 60;

const LAPTOP_HARBOR = { ...HARBOR, id: bookId('2c84e1f6-9d3a-4b07-a5e2-6f1d8b3c0a47') };

const LAPTOP_VOCAB: Tag = {
  id: tagId('5b8d2f17-e6c9-4a30-b1d4-9e7a3c0f62d8'),
  name: 'Vocab',
  colour: 'clay',
  createdAt: sampleTime(3),
};

const LAPTOP_ONLY = sampleCapture({
  id: 'c3e6a9d2-0f4b-4718-9a5c-d2b7e1f0a364',
  book: LAPTOP_HARBOR.id,
  page: 30,
  text: '静かな夜',
  minute: 40,
});

const PHONE_START: Holdings = {
  books: [HARBOR, LANTERNS],
  removedBooks: [],
  tags: [VOCAB, GRAMMAR],
  captures: [HARBOR_FIRST, HARBOR_SECOND, LANTERN_FIRST],
};

const LAPTOP_START: Holdings = {
  books: [LAPTOP_HARBOR],
  removedBooks: [],
  tags: [LAPTOP_VOCAB],
  captures: [{ ...HARBOR_FIRST, bookId: LAPTOP_HARBOR.id, tagIds: [LAPTOP_VOCAB.id] }, LAPTOP_ONLY],
};

function otherDevice(name: DeviceName): DeviceName {
  return name === 'phone' ? 'laptop' : 'phone';
}

function importFile(transfer: Transfer): ImportFile {
  return {
    name: transfer.name,
    type: 'application/json',
    size: new TextEncoder().encode(transfer.json).length,
    text: () => Promise.resolve(transfer.json),
  };
}

class TwoDevicesView {
  readonly phone = new SimulatedDevice('phone', PHONE_START);
  readonly laptop = new SimulatedDevice('laptop', LAPTOP_START);
  #minute = $state(FIRST_MINUTE);
  #frozen = $state(false);
  #transfer = $state.raw<Transfer | null>(null);
  #importing = $state.raw<CapturesImportView | null>(null);
  #writesBefore = $state(0);
  #newId: () => string;

  constructor(newId: () => string = () => crypto.randomUUID()) {
    this.#newId = newId;
  }

  get frozen(): boolean {
    return this.#frozen;
  }

  get transfer(): Transfer | null {
    return this.#transfer;
  }

  get importing(): CapturesImportView | null {
    return this.#importing;
  }

  get writesThisImport(): number {
    const transfer = this.#transfer;
    if (transfer === null) return 0;
    return this.device(transfer.to).writes - this.#writesBefore;
  }

  device(name: DeviceName): SimulatedDevice {
    return name === 'phone' ? this.phone : this.laptop;
  }

  freeze(frozen: boolean): void {
    this.#frozen = frozen;
  }

  now(): number {
    return sampleTime(this.#minute);
  }

  edit(name: DeviceName, id: CaptureId, text: string): void {
    if (!this.#frozen) this.#minute += 1;
    const device = this.device(name);
    device.replace(withText(device.holdings, id, text, this.now()));
  }

  async send(from: DeviceName): Promise<void> {
    const exportedAt = this.now();
    const built = buildCapturesFile({
      ...this.device(from).holdings,
      exportedAt,
      appVersion: APP_VERSION,
    });
    this.#transfer = {
      from,
      to: otherDevice(from),
      name: capturesFileName(exportedAt),
      json: built.json,
      round: (this.#transfer?.round ?? 0) + 1,
    };
    await this.#open();
  }

  async importAgain(): Promise<void> {
    if (this.#transfer === null) return;
    await this.#open();
  }

  async #open(): Promise<void> {
    const transfer = this.#transfer;
    if (transfer === null) return;
    const target = this.device(transfer.to);
    const now = () => this.now();
    const view = new CapturesImportView(
      {
        previewCapturesImport: (text) =>
          previewCapturesImport(target.previewDeps({ newId: this.#newId, now }), text),
        applyCapturesImport: (plan, resolution) =>
          applyCapturesImport(target.applyDeps(now), plan, resolution),
      },
      () => Promise.resolve(),
    );
    this.#importing = view;
    this.#writesBefore = target.writes;
    await view.choose({ accepted: [importFile(transfer)], rejected: [], arrived: [] });
  }

  close(): void {
    this.#importing = null;
  }
}

function captureOf(holdings: Holdings, id: CaptureId): Capture | undefined {
  return holdings.captures.find((capture) => capture.id === id);
}

export {
  LAPTOP_HARBOR,
  LAPTOP_ONLY,
  LAPTOP_VOCAB,
  LAPTOP_START,
  PHONE_START,
  TwoDevicesView,
  captureOf,
};
export type { Transfer };
