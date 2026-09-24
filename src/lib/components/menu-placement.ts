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

type MenuBlockPlacement =
  | { readonly side: 'below'; readonly top: number }
  | { readonly side: 'above'; readonly bottom: number };

type MenuPlacement = {
  readonly block: MenuBlockPlacement;
  readonly left: number;
  readonly right: number;
  readonly anchorWidth: number;
};

type MenuInset = {
  readonly top: string | undefined;
  readonly bottom: string | undefined;
  readonly left: string | undefined;
  readonly right: string | undefined;
  readonly anchorWidth: string | undefined;
};

const NO_INSET: MenuInset = {
  top: undefined,
  bottom: undefined,
  left: undefined,
  right: undefined,
  anchorWidth: undefined,
};

function menuBlock(anchor: AnchorRect, viewport: Viewport, menuHeight: number): MenuBlockPlacement {
  const below = viewport.height - anchor.bottom;
  const above = anchor.top;
  if (menuHeight > below && above > below) {
    return { side: 'above', bottom: viewport.height - anchor.top };
  }
  return { side: 'below', top: anchor.bottom };
}

function menuPlacement(anchor: AnchorRect, viewport: Viewport, menuHeight: number): MenuPlacement {
  return {
    block: menuBlock(anchor, viewport, menuHeight),
    left: anchor.left,
    right: viewport.width - anchor.right,
    anchorWidth: anchor.right - anchor.left,
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
  };
}

export { menuInset, menuPlacement };
export type { AnchorRect, MenuBlockPlacement, MenuInset, MenuPlacement, Viewport };
