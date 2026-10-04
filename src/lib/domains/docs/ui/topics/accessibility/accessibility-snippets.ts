import type { SourceSnippet } from '../ocr/ocr-snippets';

const FLOW_KEY_MOVE: SourceSnippet = {
  label: 'The EPUB reader decides per key, in src/lib/domains/flowing/ui/flow-turn.ts',
  file: 'src/lib/domains/flowing/ui/flow-turn.ts',
  code: `function keyMove(press: KeyPress): FlowMove {
  if (press.typing) return STAY;
  if (press.altKey || press.ctrlKey || press.metaKey) return STAY;
  if (press.key === ' ') {
    if (press.pressesOnSpace) return STAY;

    return press.shiftKey ? BACKWARD : FORWARD;
  }
  if (press.shiftKey) return STAY;

  return match(press.key)
    .with('ArrowLeft', () => LEFTWARD)
    .with('ArrowRight', () => RIGHTWARD)
    .with('ArrowUp', 'PageUp', () => BACKWARD)
    .with('ArrowDown', 'PageDown', () => FORWARD)
    .otherwise(() => STAY);
}`,
};

const FLOW_PRESSES_ON_SPACE: SourceSnippet = {
  label: 'What counts as pressed by Space, in the same file',
  file: 'src/lib/domains/flowing/ui/flow-turn.ts',
  code: `function pressesOnSpace(target: KeyTarget | null): boolean {
  if (target === null) return false;
  if (target.role !== null && target.role.toLowerCase() === BUTTON_ROLE) return true;

  return PRESSED_ON_SPACE.has(target.tagName.toUpperCase());
}`,
};

const FLOW_ONKEY: SourceSnippet = {
  label: 'FlowViewer.svelte turns the page and cancels only a key that moved',
  file: 'src/lib/domains/flowing/ui/FlowViewer.svelte',
  code: `const pressed = keyTarget(event.target);
const move = gestures.keyed({
  key: event.key,
  altKey: event.altKey,
  ctrlKey: event.ctrlKey,
  metaKey: event.metaKey,
  shiftKey: event.shiftKey,
  typing: isTyping(pressed),
  pressesOnSpace: pressesOnSpace(pressed),
});
if (move.kind !== 'stay') event.preventDefault();`,
};

const READER_ARROWS: SourceSnippet = {
  label: 'The image reader turns on the side arrows, in ReaderScreen.svelte',
  file: 'src/lib/domains/viewing/ui/ReaderScreen.svelte',
  code: `function onkeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  if (downward) return;
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
  if (handlesOwnKeys(event.target)) return;

  event.preventDefault();
  if (event.key === forwardKey) void view.navigation.next();
  else void view.navigation.previous();
}`,
};

const HANDLES_OWN_SPACE: SourceSnippet = {
  label: 'src/lib/domains/viewing/ui/keyboard.ts',
  file: 'src/lib/domains/viewing/ui/keyboard.ts',
  code: `function handlesOwnSpace(target: EventTarget | null): boolean {
  if (handlesOwnKeys(target)) return true;
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'BUTTON' || target.getAttribute('role') === 'button';
}`,
};

const PAGED_SPACE: SourceSnippet = {
  label: 'PagedViewer.svelte holds Space for panning, except over a button',
  file: 'src/lib/domains/viewing/ui/PagedViewer.svelte',
  code: `if (event.key === ' ') {
  if (handlesOwnSpace(event.target)) return;
  event.preventDefault();
  pan.holdSpace();
  return;
}`,
};

const ICON_BUTTON_FACE: SourceSnippet = {
  label: 'IconButton.svelte puts its required label in hidden text',
  file: 'src/lib/components/IconButton.svelte',
  code: `{#snippet face()}
  {#if Icon !== undefined}
    <Icon class="btn-icon" />
  {:else}
    {@render children?.()}
  {/if}
  <span class="visually-hidden">{label}</span>
{/snippet}`,
};

const VISUALLY_HIDDEN: SourceSnippet = {
  label: 'src/lib/styles/utilities/text.css',
  file: 'src/lib/styles/utilities/text.css',
  code: `.visually-hidden {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}`,
};

const FIELD_LABEL: SourceSnippet = {
  label: 'Field.svelte ties its label to the control by id',
  file: 'src/lib/components/Field.svelte',
  code: `<label class={['field-label', { 'visually-hidden': hideLabel }]} for={ids.control}>{label}</label>`,
};

const FIELD_CONTROL: SourceSnippet = {
  label: 'The attributes a Field passes to its control, in field.ts',
  file: 'src/lib/components/field.ts',
  code: `function fieldControl(ids: FieldIds, hasHint: boolean, hasError: boolean): FieldControl {
  const described = [hasHint ? ids.hint : '', hasError ? ids.error : ''].filter((id) => id !== '');
  return {
    id: ids.control,
    'aria-describedby': described.length === 0 ? undefined : described.join(' '),
    'aria-invalid': hasError ? 'true' : undefined,
  };
}`,
};

const MODAL_SHOW: SourceSnippet = {
  label: 'Modal.svelte opens the dialog as modal and focuses inside it',
  file: 'src/lib/components/Modal.svelte',
  code: `function focusFirst(): void {
  const first = dialog?.querySelector('[autofocus]') ?? dialog?.querySelector('.modal-close');
  if (first instanceof HTMLElement) first.focus();
}`,
};

const MODAL_WRAP: SourceSnippet = {
  label: "Modal's keydown, when wrapFocus is set",
  file: 'src/lib/components/Modal.svelte',
  code: `onkeydown?.(event);
if (!wrapFocus || event.key !== 'Tab' || event.defaultPrevented) return;
const stops = tabStops(event.currentTarget);
const current = stops.findIndex((stop) => stop === document.activeElement);
const target = wrappedStop(stops.length, current, event.shiftKey);
if (target === null) return;
event.preventDefault();
stops[target]?.focus();`,
};

const WRAPPED_STOP: SourceSnippet = {
  label: 'src/lib/components/focus-wrap.ts',
  file: 'src/lib/components/focus-wrap.ts',
  code: `function wrappedStop(stops: number, current: number, backwards: boolean): number | null {
  if (stops === 0 || current < 0) return null;
  if (backwards) return current === 0 ? stops - 1 : null;
  return current === stops - 1 ? 0 : null;
}`,
};

const CHROME_BAR_INERT: SourceSnippet = {
  label: 'ChromeBar.svelte',
  file: 'src/lib/components/ChromeBar.svelte',
  code: `class={['chrome-bar', shape.classes, 'hushable', { 'is-hushed': !shown }, className]}
inert={!shown}`,
};

const CAROUSEL_INERT: SourceSnippet = {
  label: 'Carousel.svelte',
  file: 'src/lib/components/Carousel.svelte',
  code: `inert={item.beside !== 0}`,
};

const TOAST_REGION: SourceSnippet = {
  label: 'ToastRegion.svelte',
  file: 'src/lib/components/ToastRegion.svelte',
  code: `popover="manual"
aria-live="polite"`,
};

const ANNOUNCEMENT_ROLE: SourceSnippet = {
  label: 'src/lib/components/announcement.ts',
  file: 'src/lib/components/announcement.ts',
  code: `function announcementRole(variant: StatusVariant): AnnouncementRole {
  return match(variant)
    .returnType<AnnouncementRole>()
    .with('danger', () => 'alert')
    .with('info', 'success', 'warning', () => 'status')
    .exhaustive();
}`,
};

const CAPTURE_STATUS: SourceSnippet = {
  label: 'CapturePanel.svelte',
  file: 'src/lib/domains/recognition/ui/capture/CapturePanel.svelte',
  code: `<p class="visually-hidden" role="status">{panel.announcement}</p>
<p class="visually-hidden" role="status">{panel.copying.told}</p>`,
};

const REDUCED_MOTION_CSS: SourceSnippet = {
  label: 'The start of the block in src/lib/styles/overrides/overrides.css',
  file: 'src/lib/styles/overrides/overrides.css',
  code: `@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition-duration: 0s;
    transition-delay: 0s;
    scroll-behavior: auto;
  }`,
};

const CAROUSEL_MOTION: SourceSnippet = {
  label: 'Carousel.svelte stops a slide following the finger',
  file: 'src/lib/components/Carousel.svelte',
  code: `const fed: CarouselInput =
  input.kind === 'follow' && reducedMotion.current ? { kind: 'follow', travel: 0 } : input;`,
};

const SCROLL_MOTION: SourceSnippet = {
  label: 'src/lib/domains/viewing/ui/scroll-motion.ts',
  file: 'src/lib/domains/viewing/ui/scroll-motion.ts',
  code: `function scrollMotion(reduced: boolean): ScrollBehavior {
  return reduced ? 'instant' : 'smooth';
}`,
};

const CAPTURE_TEXT: SourceSnippet = {
  label: 'CaptureCard.svelte shows the recognized text',
  file: 'src/lib/domains/recognition/ui/capture/CaptureCard.svelte',
  code: `<p class="m-0 text-lg" lang={language}>{card.text}</p>`,
};

const ACCESSIBILITY_SNIPPETS: readonly SourceSnippet[] = [
  FLOW_KEY_MOVE,
  FLOW_PRESSES_ON_SPACE,
  FLOW_ONKEY,
  READER_ARROWS,
  HANDLES_OWN_SPACE,
  PAGED_SPACE,
  ICON_BUTTON_FACE,
  VISUALLY_HIDDEN,
  FIELD_LABEL,
  FIELD_CONTROL,
  MODAL_SHOW,
  MODAL_WRAP,
  WRAPPED_STOP,
  CHROME_BAR_INERT,
  CAROUSEL_INERT,
  TOAST_REGION,
  ANNOUNCEMENT_ROLE,
  CAPTURE_STATUS,
  REDUCED_MOTION_CSS,
  CAROUSEL_MOTION,
  SCROLL_MOTION,
  CAPTURE_TEXT,
];

export {
  ACCESSIBILITY_SNIPPETS,
  ANNOUNCEMENT_ROLE,
  CAPTURE_STATUS,
  CAPTURE_TEXT,
  CAROUSEL_INERT,
  CAROUSEL_MOTION,
  CHROME_BAR_INERT,
  FIELD_CONTROL,
  FIELD_LABEL,
  FLOW_KEY_MOVE,
  FLOW_ONKEY,
  FLOW_PRESSES_ON_SPACE,
  HANDLES_OWN_SPACE,
  ICON_BUTTON_FACE,
  MODAL_SHOW,
  MODAL_WRAP,
  PAGED_SPACE,
  READER_ARROWS,
  REDUCED_MOTION_CSS,
  SCROLL_MOTION,
  TOAST_REGION,
  VISUALLY_HIDDEN,
  WRAPPED_STOP,
};
