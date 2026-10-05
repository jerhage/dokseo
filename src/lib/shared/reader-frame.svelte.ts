import { dockPlacement, dockToggle } from '$lib/ui/components/dock';
import type { DockPlacement } from '$lib/ui/components/dock';
import { ChromeFocus } from './chrome-focus.svelte';
import type { FocusedNodes } from './chrome-focus.svelte';
import { askedAfterCapture, isNarrow } from './panel-dock';
import { chromeShown } from './reader-chrome';
import type { ScreenWidth } from './layout-kind';
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

const NOTHING_HOLDS: () => boolean = () => false;

type ScreenFitted = (screen: ScreenWidth) => void;

const NOTHING_FITS: ScreenFitted = () => {};

class ReaderFrameView {
  topBar = $state<HTMLElement | null>();
  bottomBar = $state<HTMLElement | null>();
  topHeight = $state(0);
  bottomHeight = $state(0);
  bodyHeight = $state(0);
  pageHeight = $state(0);
  sheetCover = $state(0);
  readonly focus: ChromeFocus;
  #panelAsked = $state<boolean | null>(null);
  #barsAsked = $state(false);
  #holdsBars: () => boolean;
  #fitted: ScreenFitted;
  #bodyWidth = $state(0);
  #compactWidth = $state(0);
  #reported: ScreenWidth | null = null;

  constructor(
    focused: FocusedNodes = FOCUSED_OR_OPEN,
    holdsBars: () => boolean = NOTHING_HOLDS,
    fitted: ScreenFitted = NOTHING_FITS,
  ) {
    this.focus = new ChromeFocus(() => this.bars, focused);
    this.#holdsBars = holdsBars;
    this.#fitted = fitted;
  }

  get bodyWidth(): number {
    return this.#bodyWidth;
  }

  set bodyWidth(width: number) {
    this.#bodyWidth = width;
    this.#report();
  }

  get compactWidth(): number {
    return this.#compactWidth;
  }

  set compactWidth(width: number) {
    this.#compactWidth = width;
    this.#report();
  }

  get screen(): ScreenWidth {
    return this.narrow ? 'narrow' : 'wide';
  }

  get barsShown(): boolean {
    return chromeShown(this.#barsAsked, this.focus.held || this.#holdsBars());
  }

  toggleBars(focused: Element | null, surface: ReadingSurface | null): void {
    const shown = this.barsShown;
    if (shown) this.releaseBars(focused, surface);
    this.#barsAsked = !shown;
  }

  get bars(): readonly (HTMLElement | null | undefined)[] {
    return [this.topBar, this.bottomBar];
  }

  get narrow(): boolean {
    return isNarrow(this.bodyWidth, this.compactWidth);
  }

  get placement(): DockPlacement {
    return dockPlacement(this.narrow, this.#panelAsked);
  }

  get panelOpen(): boolean {
    return dockToggle(this.placement).open;
  }

  togglePanel(): void {
    this.#panelAsked = !dockToggle(this.placement).open;
  }

  panelAfterCapture(): void {
    this.#panelAsked = askedAfterCapture(this.narrow, this.#panelAsked);
  }

  pinLift(shown: boolean): number {
    return (shown ? this.bottomHeight : 0) + this.sheetCover;
  }

  toastClearance(shown: boolean): number {
    return this.bodyHeight - this.pageHeight + this.pinLift(shown);
  }

  #report(): void {
    if (this.#bodyWidth <= 0 || this.#compactWidth <= 0) return;
    const screen = this.screen;
    if (screen === this.#reported) return;
    this.#reported = screen;
    this.#fitted(screen);
  }

  releaseBars(focused: Element | null, surface: ReadingSurface | null): void {
    if (!(focused instanceof HTMLElement)) return;
    returnFocusToPage(focused, this.bars, surface);
  }
}

export { FOCUSED_OR_OPEN, NOTHING_HOLDS, ReaderFrameView };
export type { ScreenFitted };
