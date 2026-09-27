import { menuBlock } from './menu-placement';
import type { AnchorRect, MenuSize, Viewport } from './menu-placement';

type PopoverSpacing = {
  readonly gap: number;
  readonly edge: number;
};

type PopoverPlacement = {
  readonly top: number;
  readonly left: number;
};

const POPOVER_SPACING: PopoverSpacing = { gap: 8, edge: 8 };

function clamp(value: number, least: number, most: number): number {
  return Math.max(least, Math.min(value, most));
}

function popoverPlacement(
  anchor: AnchorRect,
  viewport: Viewport,
  size: MenuSize,
  spacing: PopoverSpacing = POPOVER_SPACING,
): PopoverPlacement {
  const { gap, edge } = spacing;
  const block = menuBlock(anchor, viewport, size.height + gap + edge);
  const top = block.side === 'above' ? anchor.top - gap - size.height : anchor.bottom + gap;
  return {
    top: clamp(top, edge, viewport.height - size.height - edge),
    left: clamp(anchor.left, edge, viewport.width - size.width - edge),
  };
}

export { POPOVER_SPACING, popoverPlacement };
export type { PopoverPlacement, PopoverSpacing };
