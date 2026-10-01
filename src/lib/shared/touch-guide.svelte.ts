import { dueAfter, showsGuide } from './guide-kind';
import type { GuideKind } from './guide-kind';
import { guideSeen, markGuideSeen } from './seen-guides.svelte';

type SeenGuides = {
  readonly seen: (kind: GuideKind) => boolean;
  readonly mark: (kind: GuideKind) => void;
};

const REMEMBERED_GUIDES: SeenGuides = { seen: guideSeen, mark: markGuideSeen };

class TouchGuide {
  #due = $state(false);
  #kind: () => GuideKind;
  #seen: SeenGuides;

  constructor(kind: () => GuideKind, seen: SeenGuides = REMEMBERED_GUIDES) {
    this.#kind = kind;
    this.#seen = seen;
  }

  get due(): boolean {
    return this.#due;
  }

  shownWhen(offered: boolean): boolean {
    return showsGuide({ offered, due: this.#due });
  }

  open(): void {
    this.#due = dueAfter({ kind: 'opened', seen: this.#seen.seen(this.#kind()) });
  }

  recall(): void {
    this.#due = dueAfter({ kind: 'recalled' });
  }

  dismiss(): void {
    this.#due = dueAfter({ kind: 'dismissed' });
    this.#seen.mark(this.#kind());
  }

  close(): void {
    this.#due = false;
  }
}

export { TouchGuide };
export type { SeenGuides };
