import { dockPlacement, dockToggle } from '$lib/ui/components/dock';
import type { DockPlacement } from '$lib/ui/components/dock';
import type { ScreenWidth } from './layout-kind';
import { isNarrow } from './panel-dock';

type FrameHeights = {
  readonly bodyHeight: number;
  readonly pageHeight: number;
  readonly bottomHeight: number;
  readonly sheetCover: number;
};

type DockState = {
  readonly placement: DockPlacement;
  readonly open: boolean;
};

function reportedScreen(bodyWidth: number, compactWidth: number): ScreenWidth | null {
  if (bodyWidth <= 0 || compactWidth <= 0) return null;
  return isNarrow(bodyWidth, compactWidth) ? 'narrow' : 'wide';
}

function dockState(narrow: boolean, asked: boolean | null): DockState {
  const placement = dockPlacement(narrow, asked);
  return { placement, open: dockToggle(placement).open };
}

function pinLift(
  shown: boolean,
  heights: Pick<FrameHeights, 'bottomHeight' | 'sheetCover'>,
): number {
  return (shown ? heights.bottomHeight : 0) + heights.sheetCover;
}

function toastClearance(shown: boolean, heights: FrameHeights): number {
  return heights.bodyHeight - heights.pageHeight + pinLift(shown, heights);
}

export { dockState, pinLift, reportedScreen, toastClearance };
export type { DockState, FrameHeights };
