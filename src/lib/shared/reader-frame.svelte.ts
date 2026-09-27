import { ChromeFocus } from './chrome-focus.svelte';
import type { FocusedNodes } from './chrome-focus.svelte';
import { askedAfterCapture, dockPlacement, dockToggle, isNarrow } from './panel-dock';
import type { DockPlacement } from './panel-dock';
import { returnFocusToPage } from './reading-surface';
import type { ReadingSurface } from './reading-surface';

function openPopovers(): readonly Element[] {
  try {
    return [...document.querySelectorAll(':popover-open')];
  } catch {
    return [];
  }
}

const FOCUSED_OR_OPEN: FocusedNodes = () => [document.activeElement, ...openPopovers()];

class ReaderFrameView {
  topBar = $state<HTMLElement | null>(null);
  bottomBar = $state<HTMLElement | null>(null);
  topHeight = $state(0);
  bottomHeight = $state(0);
  bodyWidth = $state(0);
  bodyHeight = $state(0);
  pageHeight = $state(0);
  compactWidth = $state(0);
  readonly focus: ChromeFocus;
  #panelAsked = $state<boolean | null>(null);

  constructor(focused: FocusedNodes = FOCUSED_OR_OPEN) {
    this.focus = new ChromeFocus(() => this.bars, focused);
  }

  get bars(): readonly (HTMLElement | null)[] {
    return [this.topBar, this.bottomBar];
  }

  get narrow(): boolean {
    return isNarrow(this.bodyWidth, this.compactWidth);
  }

  get placement(): DockPlacement {
    return dockPlacement(this.narrow, this.#panelAsked);
  }

  togglePanel(): void {
    this.#panelAsked = !dockToggle(this.placement).open;
  }

  panelAfterCapture(): void {
    this.#panelAsked = askedAfterCapture(this.narrow, this.#panelAsked);
  }

  toastClearance(shown: boolean): number {
    return this.bodyHeight - this.pageHeight + (shown ? this.bottomHeight : 0);
  }

  releaseBars(focused: Element | null, surface: ReadingSurface | null): void {
    if (!(focused instanceof HTMLElement)) return;
    returnFocusToPage(focused, this.bars, surface);
  }
}

export { ReaderFrameView };
