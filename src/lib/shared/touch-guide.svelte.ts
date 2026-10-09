import { dueAfter, showsGuide } from './guide-kind';
import type { GuideKind } from './guide-kind';
import { guideSeen, markGuideSeen } from './seen-guides.svelte';

type SeenGuides = {
  readonly seen: (kind: GuideKind) => boolean;
  readonly mark: (kind: GuideKind) => void;
};

const REMEMBERED_GUIDES: SeenGuides = { seen: guideSeen, mark: markGuideSeen };

function createTouchGuide(kind: () => GuideKind, seen: SeenGuides = REMEMBERED_GUIDES) {
  let due = $state(false);

  return {
    get due(): boolean {
      return due;
    },
    shownWhen(offered: boolean): boolean {
      return showsGuide({ offered, due });
    },
    open(): void {
      due = dueAfter({ kind: 'opened', seen: seen.seen(kind()) });
    },
    recall(): void {
      due = dueAfter({ kind: 'recalled' });
    },
    dismiss(): void {
      due = dueAfter({ kind: 'dismissed' });
      seen.mark(kind());
    },
    close(): void {
      due = false;
    },
  };
}

export { createTouchGuide };
export type { SeenGuides };
