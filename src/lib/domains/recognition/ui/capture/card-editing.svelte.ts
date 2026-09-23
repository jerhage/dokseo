import type { CaptureId } from '$lib/shared/ids';
import type { Language } from '$lib/shared/language';

type FocusTarget = {
  readonly focus: () => void;
};

type CardField =
  | { readonly kind: 'capture'; readonly language: Language | null }
  | { readonly kind: 'note' };

class CardEditing {
  draft = $state('');

  #capture = $state.raw<CaptureId | null>(null);
  #trigger: FocusTarget | null = null;

  get capture(): CaptureId | null {
    return this.#capture;
  }

  holds(capture: CaptureId): boolean {
    return this.#capture === capture;
  }

  begin(capture: CaptureId, written: string, from: FocusTarget | null): void {
    this.#capture = capture;
    this.draft = written;
    this.#trigger = from;
  }

  abandon(): FocusTarget | null {
    const from = this.#trigger;
    this.#capture = null;
    this.draft = '';
    this.#trigger = null;

    return from;
  }
}

export { CardEditing };
export type { CardField, FocusTarget };
