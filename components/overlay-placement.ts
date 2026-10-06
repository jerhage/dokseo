import { pixelLength } from './css-length';
import type { StyleSource } from './css-length';
import type { MenuAlign } from './classes';

type AnchorRect = {
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
};

type Viewport = {
  readonly width: number;
  readonly height: number;
};

type OverlaySize = {
  readonly width: number;
  readonly height: number;
};

type InlineDirection = 'ltr' | 'rtl';

type OverlayWidth = 'content' | 'at-least-anchor';

type OverlayRequest = {
  readonly align: MenuAlign;
  readonly direction: InlineDirection;
  readonly width: OverlayWidth;
};

type OverlaySpacing = {
  readonly gap: number;
  readonly edge: number;
};

type OverlayPlacement = {
  readonly top: number;
  readonly left: number;
  readonly anchorWidth: number;
  readonly maxWidth: number;
};

type HintPlacement = {
  readonly top: number;
  readonly left: number;
};

type MenuInset = {
  readonly top: string | undefined;
  readonly left: string | undefined;
  readonly anchorWidth: string | undefined;
  readonly maxWidth: string | undefined;
};

const OVERLAY_GAP_PROPERTY = '--overlay-gap';

const OVERLAY_EDGE_PROPERTY = '--overlay-edge';

const OPPOSITE_ALIGN: Readonly<Record<MenuAlign, MenuAlign>> = { start: 'end', end: 'start' };

const NO_INSET: MenuInset = {
  top: undefined,
  left: undefined,
  anchorWidth: undefined,
  maxWidth: undefined,
};

function clamp(value: number, least: number, most: number): number {
  return Math.max(least, Math.min(value, most));
}

function overlaySpacing(style: StyleSource): OverlaySpacing {
  return {
    gap: pixelLength(style, OVERLAY_GAP_PROPERTY),
    edge: pixelLength(style, OVERLAY_EDGE_PROPERTY),
  };
}

function inlineDirection(direction: string): InlineDirection {
  return direction === 'rtl' ? 'rtl' : 'ltr';
}

function alignedStart(
  anchor: AnchorRect,
  viewportWidth: number,
  width: number,
  align: MenuAlign,
  direction: InlineDirection,
): number {
  const ltr = direction === 'ltr';
  const spanStart = ltr ? anchor.left : viewportWidth - anchor.right;
  const spanEnd = ltr ? anchor.right : viewportWidth - anchor.left;
  return align === 'start' ? spanStart : spanEnd - width;
}

function fitsInline(start: number, width: number, viewportWidth: number, edge: number): boolean {
  return start >= edge && start + width <= viewportWidth - edge;
}

function inlineStart(
  anchor: AnchorRect,
  viewportWidth: number,
  width: number,
  request: OverlayRequest,
  edge: number,
): number {
  const requested = alignedStart(anchor, viewportWidth, width, request.align, request.direction);
  if (fitsInline(requested, width, viewportWidth, edge)) return requested;
  const opposite = alignedStart(
    anchor,
    viewportWidth,
    width,
    OPPOSITE_ALIGN[request.align],
    request.direction,
  );
  if (fitsInline(opposite, width, viewportWidth, edge)) return opposite;
  return requested;
}

function blockTop(
  anchor: AnchorRect,
  viewport: Viewport,
  height: number,
  spacing: OverlaySpacing,
): number {
  const { gap, edge } = spacing;
  const below = viewport.height - anchor.bottom;
  const above = anchor.top;
  const flipped = height + gap + edge > below && above > below;
  const top = flipped ? anchor.top - gap - height : anchor.bottom + gap;
  return clamp(top, edge, viewport.height - edge - height);
}

function aboveTop(
  anchor: AnchorRect,
  viewport: Viewport,
  height: number,
  spacing: OverlaySpacing,
): number {
  const { gap, edge } = spacing;
  const above = anchor.top;
  const below = viewport.height - anchor.bottom;
  const flipped = height + gap + edge > above && below > above;
  const top = flipped ? anchor.bottom + gap : anchor.top - gap - height;
  return clamp(top, edge, viewport.height - edge - height);
}

function hintPlacement(
  anchor: AnchorRect,
  viewport: Viewport,
  size: OverlaySize,
  spacing: OverlaySpacing,
): HintPlacement {
  const { edge } = spacing;
  const width = Math.min(size.width, Math.max(0, viewport.width - edge * 2));
  const centred = (anchor.left + anchor.right) / 2 - width / 2;
  return {
    top: aboveTop(anchor, viewport, size.height, spacing),
    left: clamp(centred, edge, viewport.width - edge - width),
  };
}

function overlayPlacement(
  anchor: AnchorRect,
  viewport: Viewport,
  size: OverlaySize,
  request: OverlayRequest,
  spacing: OverlaySpacing,
): OverlayPlacement {
  const { edge } = spacing;
  const anchorWidth = anchor.right - anchor.left;
  const maxWidth = Math.max(0, viewport.width - edge * 2);
  const wanted =
    request.width === 'at-least-anchor' ? Math.max(size.width, anchorWidth) : size.width;
  const width = Math.min(wanted, maxWidth);
  const chosen = inlineStart(anchor, viewport.width, width, request, edge);
  const start = clamp(chosen, edge, viewport.width - edge - width);
  return {
    top: blockTop(anchor, viewport, size.height, spacing),
    left: request.direction === 'ltr' ? start : viewport.width - start - width,
    anchorWidth,
    maxWidth,
  };
}

function px(value: number): string {
  return `${value}px`;
}

function menuInset(placement: OverlayPlacement | undefined): MenuInset {
  if (placement === undefined) return NO_INSET;
  return {
    top: px(placement.top),
    left: px(placement.left),
    anchorWidth: px(placement.anchorWidth),
    maxWidth: px(placement.maxWidth),
  };
}

export {
  OVERLAY_EDGE_PROPERTY,
  OVERLAY_GAP_PROPERTY,
  hintPlacement,
  inlineDirection,
  menuInset,
  overlayPlacement,
  overlaySpacing,
};
export type {
  AnchorRect,
  HintPlacement,
  InlineDirection,
  MenuInset,
  OverlayPlacement,
  OverlayRequest,
  OverlaySize,
  OverlaySpacing,
  OverlayWidth,
  Viewport,
};
