import type { ReadingDirection } from '$lib/shared/layout-kind';
import { CLICK_EDGE_SHARE } from '$lib/shared/page-turn';
import type { FrameSpan, TurnSide } from '$lib/shared/page-turn';
import { moveTowards } from './page-moves';
import type { PageMove } from './page-moves';

type PageClick =
  | { readonly kind: 'turn'; readonly move: PageMove }
  | { readonly kind: 'toggle-chrome' };

const TOGGLES_THE_CHROME: PageClick = { kind: 'toggle-chrome' };

function clickedEdge(x: number, frame: FrameSpan): TurnSide | null {
  const across = x - frame.left;
  if (!Number.isFinite(across) || !Number.isFinite(frame.width) || frame.width <= 0) return null;

  const edge = frame.width * CLICK_EDGE_SHARE;
  if (across < edge) return 'left';
  if (across > frame.width - edge) return 'right';

  return null;
}

function pageClick(
  x: number,
  frame: FrameSpan,
  direction: ReadingDirection,
  edgeClicksTurn: boolean,
): PageClick {
  if (!edgeClicksTurn) return TOGGLES_THE_CHROME;

  const side = clickedEdge(x, frame);
  if (side === null) return TOGGLES_THE_CHROME;

  return { kind: 'turn', move: moveTowards(side, 'paged', direction) };
}

export { pageClick };
export type { PageClick };
