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

type MenuSize = {
  readonly width: number;
  readonly height: number;
};

type InlineDirection = 'ltr' | 'rtl';

type MenuRequest = {
  readonly align: MenuAlign;
  readonly direction: InlineDirection;
  readonly gutter: number;
};

type MenuBlockPlacement =
  | { readonly side: 'below'; readonly top: number }
  | { readonly side: 'above'; readonly bottom: number };

type MenuPlacement = {
  readonly block: MenuBlockPlacement;
  readonly align: MenuAlign;
  readonly left: number;
  readonly right: number;
  readonly anchorWidth: number;
  readonly maxWidth: number;
};

type MenuInset = {
  readonly top: string | undefined;
  readonly bottom: string | undefined;
  readonly left: string | undefined;
  readonly right: string | undefined;
  readonly anchorWidth: string | undefined;
  readonly maxWidth: string | undefined;
};

type InlineSpan = {
  readonly start: number;
  readonly end: number;
};

type InlinePlacement = {
  readonly align: MenuAlign;
  readonly start: number;
};

const NO_INSET: MenuInset = {
  top: undefined,
  bottom: undefined,
  left: undefined,
  right: undefined,
  anchorWidth: undefined,
  maxWidth: undefined,
};

const OPPOSITE: Readonly<Record<MenuAlign, MenuAlign>> = { start: 'end', end: 'start' };

function menuBlock(anchor: AnchorRect, viewport: Viewport, menuHeight: number): MenuBlockPlacement {
  const below = viewport.height - anchor.bottom;
  const above = anchor.top;
  if (menuHeight > below && above > below) {
    return { side: 'above', bottom: viewport.height - anchor.top };
  }
  return { side: 'below', top: anchor.bottom };
}

function inlineSpan(
  anchor: AnchorRect,
  viewportWidth: number,
  direction: InlineDirection,
): InlineSpan {
  if (direction === 'ltr') return { start: anchor.left, end: anchor.right };
  return { start: viewportWidth - anchor.right, end: viewportWidth - anchor.left };
}

function alignedStart(align: MenuAlign, span: InlineSpan, width: number): number {
  return align === 'start' ? span.start : span.end - width;
}

function fits(start: number, width: number, viewportWidth: number): boolean {
  return start >= 0 && start + width <= viewportWidth;
}

function menuInline(
  span: InlineSpan,
  viewportWidth: number,
  width: number,
  request: MenuRequest,
): InlinePlacement {
  const requested = alignedStart(request.align, span, width);
  if (fits(requested, width, viewportWidth)) return { align: request.align, start: requested };
  const flipped = OPPOSITE[request.align];
  const other = alignedStart(flipped, span, width);
  if (fits(other, width, viewportWidth)) return { align: flipped, start: other };
  const latest = viewportWidth - request.gutter - width;
  return { align: request.align, start: Math.max(request.gutter, Math.min(requested, latest)) };
}

function menuPlacement(
  anchor: AnchorRect,
  viewport: Viewport,
  menu: MenuSize,
  request: MenuRequest,
): MenuPlacement {
  const anchorWidth = anchor.right - anchor.left;
  const maxWidth = viewport.width - request.gutter * 2;
  const width = Math.min(Math.max(menu.width, anchorWidth), maxWidth);
  const span = inlineSpan(anchor, viewport.width, request.direction);
  const inline = menuInline(span, viewport.width, width, request);
  const end = viewport.width - inline.start - width;
  const ltr = request.direction === 'ltr';
  return {
    block: menuBlock(anchor, viewport, menu.height),
    align: inline.align,
    left: ltr ? inline.start : end,
    right: ltr ? end : inline.start,
    anchorWidth,
    maxWidth,
  };
}

function px(value: number): string {
  return `${value}px`;
}

function menuInset(placement: MenuPlacement | undefined): MenuInset {
  if (placement === undefined) return NO_INSET;
  const { block } = placement;
  return {
    top: block.side === 'below' ? px(block.top) : undefined,
    bottom: block.side === 'above' ? px(block.bottom) : undefined,
    left: px(placement.left),
    right: px(placement.right),
    anchorWidth: px(placement.anchorWidth),
    maxWidth: px(placement.maxWidth),
  };
}

export { menuInset, menuPlacement };
export type {
  AnchorRect,
  InlineDirection,
  MenuBlockPlacement,
  MenuInset,
  MenuPlacement,
  MenuRequest,
  MenuSize,
  Viewport,
};
