const CLICK_SLOP_PX = 3;

const TOUCH_SLOP_PX = 12;

function clickSlop(pointerType: string): number {
  return pointerType === 'touch' ? TOUCH_SLOP_PX : CLICK_SLOP_PX;
}

export { CLICK_SLOP_PX, TOUCH_SLOP_PX, clickSlop };
