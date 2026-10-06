import type { InlineDirection, OverlayPlacement, OverlaySize, Viewport } from './overlay-placement';

type PointerSpot = {
  readonly x: number;
  readonly y: number;
};

function clamp(value: number, least: number, most: number): number {
  return Math.max(least, Math.min(value, most));
}

function opensMenuByKey(key: string, shiftKey: boolean): boolean {
  return key === 'ContextMenu' || (key === 'F10' && shiftKey);
}

function besideSpot(at: number, size: number, room: number, edge: number, before: boolean): number {
  const after = at;
  const ahead = at - size;
  if (before) return ahead >= edge ? ahead : after;
  return after + size <= room - edge ? after : ahead;
}

function pointerPlacement(
  spot: PointerSpot,
  viewport: Viewport,
  size: OverlaySize,
  edge: number,
  direction: InlineDirection,
): OverlayPlacement {
  const maxWidth = Math.max(0, viewport.width - edge * 2);
  const width = Math.min(size.width, maxWidth);
  const left = besideSpot(spot.x, width, viewport.width, edge, direction === 'rtl');
  const top = besideSpot(spot.y, size.height, viewport.height, edge, false);
  return {
    top: clamp(top, edge, viewport.height - edge - size.height),
    left: clamp(left, edge, viewport.width - edge - width),
    anchorWidth: 0,
    maxWidth,
  };
}

export { opensMenuByKey, pointerPlacement };
export type { PointerSpot };
