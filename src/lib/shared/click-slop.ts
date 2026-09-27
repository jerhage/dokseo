import { TOUCH_SLOP_PX } from '$lib/components/gesture';

const CLICK_SLOP_PX = 3;

function clickSlop(pointerType: string): number {
  return pointerType === 'touch' ? TOUCH_SLOP_PX : CLICK_SLOP_PX;
}

export { CLICK_SLOP_PX, TOUCH_SLOP_PX, clickSlop };
