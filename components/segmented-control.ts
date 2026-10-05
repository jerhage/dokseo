import { match } from 'ts-pattern';
import type { ButtonVariant, ClassList } from './classes';

type SegmentedVariant = 'default' | 'ghost' | 'outline' | 'track';

type SegmentOption<V extends string> = {
  readonly value: V;
  readonly label: string;
  readonly disabled?: boolean;
};

type SegmentLook =
  | { readonly kind: 'button'; readonly variant: ButtonVariant }
  | { readonly kind: 'chip' };

const SEGMENTED_VARIANTS: Readonly<Record<SegmentedVariant, ClassList>> = {
  default: [],
  ghost: [],
  outline: [],
  track: ['segmented-track'],
};

function segmentLook(variant: SegmentedVariant, pressed: boolean): SegmentLook {
  return match(variant)
    .returnType<SegmentLook>()
    .with('default', () => ({ kind: 'button', variant: 'default' }))
    .with('ghost', () => ({ kind: 'button', variant: 'ghost' }))
    .with('outline', () => ({ kind: 'button', variant: pressed ? 'outline' : 'default' }))
    .with('track', () => ({ kind: 'chip' }))
    .exhaustive();
}

function groupRole(
  label: string | undefined,
  labelledBy: string | null | undefined,
): 'group' | undefined {
  const named = label !== undefined || (labelledBy !== undefined && labelledBy !== null);
  return named ? 'group' : undefined;
}

export { SEGMENTED_VARIANTS, groupRole, segmentLook };
export type { SegmentLook, SegmentOption, SegmentedVariant };
