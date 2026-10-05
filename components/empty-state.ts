import type { ClassList } from './classes';

type EmptyStateVariant = 'fill' | 'inline';

const EMPTY_STATE_VARIANTS: Readonly<Record<EmptyStateVariant, ClassList>> = {
  fill: ['empty-state-fill'],
  inline: ['empty-state-inline'],
};

export { EMPTY_STATE_VARIANTS };
export type { EmptyStateVariant };
