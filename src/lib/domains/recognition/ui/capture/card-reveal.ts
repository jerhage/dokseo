import type { CaptureId } from '$lib/shared/ids';
import { NO_REVEAL, revealCard } from './capture-reveal';
import type { CaptureReveal } from './capture-reveal';

function createCardReveal() {
  let reveal: CaptureReveal = NO_REVEAL;

  return {
    reveals(id: CaptureId, latest: CaptureId | null, visible: boolean): boolean {
      const step = revealCard(reveal, id, latest, visible);
      reveal = step.state;
      return step.scroll;
    },
  };
}

type CardRevealHook = ReturnType<typeof createCardReveal>;

export { createCardReveal };
export type { CardRevealHook };
