import type { ReadingDirection } from '$lib/shared/layout-kind';
import type { FrameSpan, TurnSide } from '$lib/shared/page-turn';
import { moveTowards } from './page-moves';
import type { PageMove } from './page-moves';

type PageClick =
  | { readonly kind: 'turn'; readonly move: PageMove }
  | { readonly kind: 'toggle-chrome' };

const CLICK_EDGE_SHARE = 0.1;

const TOGGLES_THE_CHROME: PageClick = { kind: 'toggle-chrome' };

function clickedEdge(x: number, frame: FrameSpan): TurnSide | null {
  const across = x - frame.left;
  if (!Number.isFinite(across) || !Number.isFinite(frame.width) || frame.width <= 0) return null;

  const edge = frame.width * CLICK_EDGE_SHARE;
  if (across < edge) return 'left';
  if (across > frame.width - edge) return 'right';

  return null;
}

function pageClick(x: number, frame: FrameSpan, direction: ReadingDirection): PageClick {
  const side = clickedEdge(x, frame);
  if (side === null) return TOGGLES_THE_CHROME;

  return { kind: 'turn', move: moveTowards(side, 'paged', direction) };
}

export { CLICK_EDGE_SHARE, pageClick };
export type { PageClick };
