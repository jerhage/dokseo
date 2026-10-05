type SourceSnippet = {
  readonly label: string;
  readonly file: string;
  readonly code: string;
};

const GESTURE_STEP: SourceSnippet = {
  label: 'The classifier only reads touch',
  file: 'src/lib/ui/components/gesture.ts',
  code: `function gestureStep(
  state: GestureState,
  input: GestureInput,
  context: GestureContext,
): GestureStep {
  if (input.kind === 'tick') return tick(state, input.t);
  if (input.type !== 'touch') return still(state);

  return match(input.kind)
    .with('down', () => down(state, input, context))
    .with('move', () => move(state, input))
    .with('up', () => up(state, input, context))
    .with('cancel', () => cancel(state, input))
    .exhaustive();
}`,
};

const GESTURE_STATE: SourceSnippet = {
  label: 'The classifier states',
  file: 'src/lib/ui/components/gesture.ts',
  code: `type GestureState =
  | { readonly kind: 'idle'; readonly pending: PendingTap | null }
  | { readonly kind: 'pressed'; readonly press: Press; readonly pending: PendingTap | null }
  | { readonly kind: 'panning'; readonly press: Press }
  | { readonly kind: 'swiping'; readonly press: Press }
  | { readonly kind: 'selecting'; readonly id: number }
  | { readonly kind: 'pinching'; readonly first: Contact; readonly second: Contact }
  | { readonly kind: 'lifting'; readonly ids: readonly number[] };`,
};

const GESTURE_DEADLINE: SourceSnippet = {
  label: 'When the classifier needs a tick',
  file: 'src/lib/ui/components/gesture.ts',
  code: `function gestureDeadline(state: GestureState): number | null {
  return match<GestureState, number | null>(state)
    .with({ kind: 'idle' }, ({ pending }) => (pending === null ? null : pending.t + DOUBLE_TAP_MS))
    .with({ kind: 'pressed' }, ({ press }) =>
      press.strayed ? null : press.startedAt + LONG_PRESS_MS,
    )`,
};

const SWIPE_TURN: SourceSnippet = {
  label: 'When a swipe turns the page',
  file: 'src/lib/shared/page-turn.ts',
  code: `function isFlung(distance: number, elapsedMs: number): boolean {
  if (distance >= SWIPE_MIN_PX) return true;
  if (distance < TOUCH_SLOP_PX || !isPositiveFinite(elapsedMs)) return false;

  return distance / elapsedMs >= SWIPE_MIN_PX_PER_MS;
}`,
};

const TAP_ZONE: SourceSnippet = {
  label: 'The tap zones',
  file: 'src/lib/shared/page-turn.ts',
  code: `function tapZone(x: number, frameWidth: number, turns: TouchTurns): TapZone {
  if (turns === 'swipe-only') return 'centre';
  if (!Number.isFinite(x) || !isPositiveFinite(frameWidth)) return 'centre';

  const side = frameWidth * SIDE_ZONE_SHARE;
  if (x < side) return 'left';
  if (x > frameWidth - side) return 'right';

  return 'centre';
}`,
};

const MOVE_ORDER: SourceSnippet = {
  label: 'Which side goes forward',
  file: 'src/lib/domains/viewing/ui/page-moves.ts',
  code: `function moveOrder(layoutKind: ImageLayoutKind, direction: ReadingDirection): MoveOrder {
  return match(layoutKind)
    .with('paged', () => (direction === 'rtl' ? INCREMENT_FIRST : DECREMENT_FIRST))
    .with('continuous', () => DECREMENT_FIRST)
    .exhaustive();
}`,
};

const TAP_ACTION: SourceSnippet = {
  label: 'What a tap does in the image reader',
  file: 'src/lib/domains/viewing/ui/touch-action.ts',
  code: `function tapAction(x: number, scene: TouchScene): TouchAction {
  if (scene.chromeShown) return TOGGLE_CHROME;

  return match<TapZone, TouchAction>(tapZone(x - scene.frame.left, scene.frame.width, scene.turns))
    .with('centre', () => TOGGLE_CHROME)
    .with('left', 'right', (side) => turnTo(moveTowards(side, 'paged', scene.direction)))
    .exhaustive();
}`,
};

const SHOWN_TURN_SETTINGS: SourceSnippet = {
  label: 'Which page-turn settings show',
  file: 'src/lib/shared/turn-settings.ts',
  code: `const TOUCH_POINTER_QUERY = '(any-pointer: coarse)';
const MOUSE_POINTER_QUERY = '(any-hover: hover)';

function pointerKinds(matches: MediaMatches): PointerKinds {
  const touch = matches(TOUCH_POINTER_QUERY);
  const mouse = matches(MOUSE_POINTER_QUERY);
  if (touch && mouse) return 'touch-and-mouse';
  if (touch) return 'touch';
  if (mouse) return 'mouse';

  return 'neither';
}

function shownTurnSettings(matches: MediaMatches): ShownTurnSettings {
  return match(pointerKinds(matches))
    .with('touch', () => ({ touchTurns: true, edgeClicks: false }))
    .with('mouse', () => ({ touchTurns: false, edgeClicks: true }))
    .with('touch-and-mouse', () => ({ touchTurns: true, edgeClicks: true }))
    .with('neither', () => ({ touchTurns: false, edgeClicks: false }))
    .exhaustive();
}`,
};

const MEDIA_MATCHES: SourceSnippet = {
  label: 'The one matchMedia read',
  file: 'src/lib/platform/dom/media-matches.ts',
  code: `function mediaMatches(query: string): boolean {
  if (typeof matchMedia !== 'function') return false;

  return matchMedia(query).matches;
}`,
};

const MARQUEE_END: SourceSnippet = {
  label: 'How a drag ends',
  file: 'src/lib/ui/components/marquee-selection.ts',
  code: `type MarqueeEnd =
  | { readonly kind: 'click' }
  | { readonly kind: 'too-small'; readonly selection: MarqueeRect }
  | { readonly kind: 'selection'; readonly selection: MarqueeRect };`,
};

const MARQUEE_END_RULE: SourceSnippet = {
  label: 'Classifying the end of a drag',
  file: 'src/lib/ui/components/marquee-selection.ts',
  code: `function marqueeEnd(
  from: MarqueePoint,
  to: MarqueePoint,
  slop: number,
  minimum: number,
): MarqueeEnd {
  const selection = marqueeRect(from, to);
  if (within(selection, slop)) return { kind: 'click' };
  if (selection.width < minimum || selection.height < minimum) {
    return { kind: 'too-small', selection };
  }

  return { kind: 'selection', selection };
}`,
};

const CLICK_SLOP: SourceSnippet = {
  label: 'The slop by pointer type',
  file: 'src/lib/shared/click-slop.ts',
  code: `const CLICK_SLOP_PX = 3;

function clickSlop(pointerType: string): number {
  return pointerType === 'touch' ? TOUCH_SLOP_PX : CLICK_SLOP_PX;
}`,
};

const CLAIMS_TOUCH_END: SourceSnippet = {
  label: 'Keeping a turning tap from foliate',
  file: 'src/lib/domains/flowing/ui/FlowViewer.svelte',
  code: `function keepTurningTapFromFoliate(event: TouchEvent): void {
    if (gestures?.claimsTouchEnd() === true) event.stopPropagation();
  }`,
};

const TOUCH_SNIPPETS: readonly SourceSnippet[] = [
  GESTURE_STEP,
  GESTURE_STATE,
  GESTURE_DEADLINE,
  SWIPE_TURN,
  TAP_ZONE,
  MOVE_ORDER,
  TAP_ACTION,
  SHOWN_TURN_SETTINGS,
  MEDIA_MATCHES,
  MARQUEE_END,
  MARQUEE_END_RULE,
  CLICK_SLOP,
  CLAIMS_TOUCH_END,
];

export {
  CLAIMS_TOUCH_END,
  CLICK_SLOP,
  GESTURE_DEADLINE,
  GESTURE_STATE,
  GESTURE_STEP,
  MARQUEE_END,
  MARQUEE_END_RULE,
  MEDIA_MATCHES,
  MOVE_ORDER,
  SHOWN_TURN_SETTINGS,
  SWIPE_TURN,
  TAP_ACTION,
  TAP_ZONE,
  TOUCH_SNIPPETS,
};
export type { SourceSnippet };
