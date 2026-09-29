import type { RelocateReason, Relocation } from 'foliate-js/view.js';
import { match } from 'ts-pattern';

type MoveCause = { readonly kind: 'travel' } | { readonly kind: 'reflow' };

type FlowRelocation = Relocation & { readonly cause: MoveCause };

const TRAVELLED: MoveCause = { kind: 'travel' };

const REFLOWED: MoveCause = { kind: 'reflow' };

function moveCause(reason: RelocateReason | null | undefined): MoveCause {
  return match(reason)
    .with('page', 'snap', 'scroll', () => TRAVELLED)
    .with('navigation', 'selection', () => TRAVELLED)
    .with('anchor', () => REFLOWED)
    .with(null, undefined, () => TRAVELLED)
    .exhaustive();
}

function flowRelocation(at: Relocation, reason: RelocateReason | null | undefined): FlowRelocation {
  return { ...at, cause: moveCause(reason) };
}

export { flowRelocation, moveCause, REFLOWED, TRAVELLED };
export type { FlowRelocation, MoveCause };
