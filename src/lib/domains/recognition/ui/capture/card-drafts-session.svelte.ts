import type { CaptureId } from '$lib/shared/ids';
import type { FocusTarget } from './focus-target';
import type { WriteOutcome } from './storage-failure';

type DraftField = 'text' | 'note';

type OpenDraft = {
  readonly field: DraftField;
  readonly capture: CaptureId;
  readonly draft: string;
  readonly from: FocusTarget | null;
};

type DraftSave =
  | { readonly kind: 'nothing' }
  | { readonly kind: 'closed'; readonly from: FocusTarget | null }
  | { readonly kind: 'kept-open' };

const NOTHING: DraftSave = { kind: 'nothing' };

const KEPT_OPEN: DraftSave = { kind: 'kept-open' };

function keyOf(field: DraftField, capture: CaptureId): string {
  return `${field}:${capture}`;
}

class CardDraftsSession {
  #open = $state.raw<ReadonlyMap<string, OpenDraft>>(new Map());
  #saving = new Set<string>();

  holds(field: DraftField, capture: CaptureId): boolean {
    return this.#open.has(keyOf(field, capture));
  }

  draft(field: DraftField, capture: CaptureId): string {
    return this.#open.get(keyOf(field, capture))?.draft ?? '';
  }

  open(field: DraftField, capture: CaptureId, written: string, from: FocusTarget | null): void {
    const key = keyOf(field, capture);
    if (this.#open.has(key)) return;

    this.#open = new Map(this.#open).set(key, { field, capture, draft: written, from });
  }

  write(field: DraftField, capture: CaptureId, draft: string): void {
    const key = keyOf(field, capture);
    const held = this.#open.get(key);
    if (held === undefined) return;

    this.#open = new Map(this.#open).set(key, { ...held, draft });
  }

  async save(
    field: DraftField,
    capture: CaptureId,
    keep: (written: string) => Promise<WriteOutcome>,
  ): Promise<DraftSave> {
    const key = keyOf(field, capture);
    const held = this.#open.get(key);
    if (held === undefined || this.#saving.has(key)) return NOTHING;

    this.#saving.add(key);
    const outcome = await keep(held.draft).finally(() => this.#saving.delete(key));
    if (outcome === 'failed') return KEPT_OPEN;

    const now = this.#open.get(key);
    if (now === undefined) return NOTHING;
    if (now.draft !== held.draft) return KEPT_OPEN;

    this.#close(key);
    return { kind: 'closed', from: held.from };
  }

  abandon(field: DraftField, capture: CaptureId): FocusTarget | null {
    const held = this.#open.get(keyOf(field, capture));
    if (held === undefined) return null;

    this.#close(keyOf(field, capture));
    return held.from;
  }

  clear(): void {
    this.#open = new Map();
  }

  forget(capture: CaptureId): void {
    this.#open = new Map([...this.#open].filter(([, held]) => held.capture !== capture));
  }

  #close(key: string): void {
    const left = new Map(this.#open);
    left.delete(key);
    this.#open = left;
  }
}

export { CardDraftsSession };
export type { DraftField, DraftSave, OpenDraft };
