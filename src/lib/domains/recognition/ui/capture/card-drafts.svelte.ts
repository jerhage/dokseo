import type { CaptureId } from '$lib/shared/ids';
import type { FocusTarget } from './card-editing.svelte';

type DraftField = 'text' | 'note';

type OpenDraft = {
  readonly field: DraftField;
  readonly capture: CaptureId;
  readonly draft: string;
  readonly from: FocusTarget | null;
};

type KeptDraft = {
  readonly field: DraftField;
  readonly capture: CaptureId;
  readonly written: string;
  readonly from: FocusTarget | null;
};

function keyOf(field: DraftField, capture: CaptureId): string {
  return `${field}:${capture}`;
}

class CardDrafts {
  #open = $state.raw<ReadonlyMap<string, OpenDraft>>(new Map());

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

  save(field: DraftField, capture: CaptureId): KeptDraft | null {
    const held = this.#open.get(keyOf(field, capture));
    if (held === undefined) return null;

    this.#close(keyOf(field, capture));
    return { field, capture, written: held.draft, from: held.from };
  }

  abandon(field: DraftField, capture: CaptureId): FocusTarget | null {
    const held = this.#open.get(keyOf(field, capture));
    if (held === undefined) return null;

    this.#close(keyOf(field, capture));
    return held.from;
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

export { CardDrafts };
export type { DraftField, KeptDraft, OpenDraft };
