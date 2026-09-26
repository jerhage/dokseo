import type { Size } from '$lib/shared/geometry';
import { swipeTurn } from '$lib/shared/page-turn';
import type { FrameSpan, TouchTurns, TurnPoint, TurnSide } from '$lib/shared/page-turn';
import { clampPan, panBy } from './viewport';
import type { Viewport } from './viewport';

type PanReach = { readonly origin: Viewport; readonly content: Size; readonly frame: Size };

type PanStroke = { readonly start: TurnPoint; readonly end: TurnPoint; readonly elapsed: number };

type TurnArea = {
  readonly span: FrameSpan;
  readonly viewportWidth: number;
  readonly turns: TouchTurns;
};

function travelPastEdge(reach: PanReach, dx: number): number {
  const from = clampPan(reach.origin, reach.content, reach.frame).panX;
  const to = clampPan(panBy(reach.origin, dx, 0), reach.content, reach.frame).panX;
  return dx - (to - from);
}

function overscrollTurn(reach: PanReach, stroke: PanStroke, area: TurnArea): TurnSide | null {
  const dx = stroke.end.x - stroke.start.x;
  if (!Number.isFinite(dx)) return null;

  const leftover = travelPastEdge(reach, dx);
  return swipeTurn(
    stroke.start,
    { x: stroke.start.x + leftover, y: stroke.end.y },
    stroke.elapsed,
    area.span,
    area.viewportWidth,
    area.turns,
  );
}

export { overscrollTurn, travelPastEdge };
export type { PanReach, PanStroke, TurnArea };
