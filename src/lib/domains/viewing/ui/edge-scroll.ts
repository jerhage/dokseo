import { match } from 'ts-pattern';

type EdgeBand = { readonly top: number; readonly bottom: number };

type EdgeZone =
  | { readonly kind: 'clear' }
  | { readonly kind: 'near-top'; readonly depth: number }
  | { readonly kind: 'near-bottom'; readonly depth: number };

const EDGE_ZONE_PX = 48;

const EDGE_TOP_SPEED_PX_PER_S = 1500;

const LONGEST_EDGE_FRAME_MS = 100;

const CLEAR: EdgeZone = { kind: 'clear' };

function edgeZone(pointerY: number, band: EdgeBand): EdgeZone {
  const height = band.bottom - band.top;
  if (!Number.isFinite(pointerY) || !Number.isFinite(height) || height <= 0) return CLEAR;

  const zone = Math.min(EDGE_ZONE_PX, height / 2);
  const intoTop = band.top + zone - pointerY;
  if (intoTop > 0) return { kind: 'near-top', depth: Math.min(1, intoTop / zone) };

  const intoBottom = pointerY - (band.bottom - zone);
  if (intoBottom > 0) return { kind: 'near-bottom', depth: Math.min(1, intoBottom / zone) };

  return CLEAR;
}

function edgeSpeed(pointerY: number, band: EdgeBand): number {
  return match(edgeZone(pointerY, band))
    .with({ kind: 'clear' }, () => 0)
    .with({ kind: 'near-top' }, ({ depth }) => -EDGE_TOP_SPEED_PX_PER_S * depth)
    .with({ kind: 'near-bottom' }, ({ depth }) => EDGE_TOP_SPEED_PX_PER_S * depth)
    .exhaustive();
}

function edgeScrollBy(speed: number, elapsedMs: number): number {
  if (!Number.isFinite(speed) || !Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;

  return (speed * Math.min(elapsedMs, LONGEST_EDGE_FRAME_MS)) / 1000;
}

export {
  EDGE_TOP_SPEED_PX_PER_S,
  EDGE_ZONE_PX,
  LONGEST_EDGE_FRAME_MS,
  edgeScrollBy,
  edgeSpeed,
  edgeZone,
};
export type { EdgeBand, EdgeZone };
