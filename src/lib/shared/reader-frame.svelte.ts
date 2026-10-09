import { createChromeFocus } from './chrome-focus.svelte';
import type { ChromeBars, FocusedNodes } from './chrome-focus.svelte';
import { askedAfterCapture } from './panel-dock';
import { chromeShown } from './reader-chrome';
import { dockState } from './reader-frame-rules';
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

function createBarsToggle(
  bars: ChromeBars,
  focused: FocusedNodes = FOCUSED_OR_OPEN,
  holdsBars: () => boolean = NOTHING_HOLDS,
) {
  let asked = $state(false);
  const focus = createChromeFocus(bars, focused);

  function shown(): boolean {
    return chromeShown(asked, focus.held || holdsBars());
  }

  function release(focusedNode: Element | null, surface: ReadingSurface | null): void {
    if (!(focusedNode instanceof HTMLElement)) return;
    returnFocusToPage(focusedNode, bars(), surface);
  }

  return {
    get shown(): boolean {
      return shown();
    },
    refresh: focus.refresh,
    toggle(focusedNode: Element | null, surface: ReadingSurface | null): void {
      const showing = shown();
      if (showing) release(focusedNode, surface);
      asked = !showing;
    },
  };
}

function createPanelDock() {
  let asked = $state<boolean | null>(null);

  return {
    get asked(): boolean | null {
      return asked;
    },
    toggle(narrow: boolean): void {
      asked = !dockState(narrow, asked).open;
    },
    afterCapture(narrow: boolean): void {
      asked = askedAfterCapture(narrow, asked);
    },
  };
}

type BarsToggleHook = ReturnType<typeof createBarsToggle>;

type PanelDockHook = ReturnType<typeof createPanelDock>;

export { FOCUSED_OR_OPEN, NOTHING_HOLDS, createBarsToggle, createPanelDock };
export type { BarsToggleHook, PanelDockHook };
