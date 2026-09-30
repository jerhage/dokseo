import { match } from 'ts-pattern';
import type { CaptureId } from '$lib/shared/ids';

type CaptureReveal =
  | { readonly kind: 'none' }
  | { readonly kind: 'pending'; readonly id: CaptureId }
  | { readonly kind: 'done'; readonly id: CaptureId };

type RevealStep = {
  readonly state: CaptureReveal;
  readonly scroll: boolean;
};

const NO_REVEAL: CaptureReveal = { kind: 'none' };

function revealFor(state: CaptureReveal, latest: CaptureId | null): CaptureReveal {
  if (latest === null) return NO_REVEAL;

  return match(state)
    .with({ kind: 'none' }, (): CaptureReveal => ({ kind: 'pending', id: latest }))
    .with({ kind: 'pending' }, { kind: 'done' }, (held): CaptureReveal =>
      held.id === latest ? held : { kind: 'pending', id: latest },
    )
    .exhaustive();
}

function revealCard(
  state: CaptureReveal,
  card: CaptureId,
  latest: CaptureId | null,
  visible: boolean,
): RevealStep {
  const held = revealFor(state, latest);
  const due = visible && held.kind === 'pending' && held.id === card;

  return due ? { state: { kind: 'done', id: card }, scroll: true } : { state: held, scroll: false };
}

export { NO_REVEAL, revealCard, revealFor };
export type { CaptureReveal, RevealStep };
