import type { Snippet } from 'svelte';
import type { ToastOptions } from '../components/toaster.svelte';
import type { ElementState, Trigger } from '../core/rules/schema.js';
import type { MarqueeHandle, RuleControls } from './rule-controls.svelte';
import * as subjects from './RuleSubjects.svelte';

type Reaching = {
  readonly controls: RuleControls;
  readonly root: ParentNode;
  readonly settle: () => Promise<void>;
  readonly fire: (trigger: Trigger) => Promise<void>;
};

type RuleSubject = {
  readonly render: Snippet<[RuleControls]>;
  readonly prepare?: (controls: RuleControls) => void;
  readonly reach?: (state: ElementState, reaching: Reaching) => Promise<boolean>;
  readonly connect?: (controls: RuleControls) => () => void;
  readonly layout?: string;
  readonly coarsePointer?: boolean;
};

const CAROUSEL_LAYOUT = '.carousel { block-size: 12rem; inline-size: 20rem; }';

const DOCK_SHEET_LAYOUT =
  'div:has(> .dock-sheet) { display: flex; flex-direction: column; justify-content: flex-end; block-size: 100dvh; }';

const MARQUEE_POINTER_EVENTS = [
  'pointerdown',
  'pointermove',
  'pointerup',
  'pointercancel',
] as const satisfies readonly (keyof MarqueeHandle)[];

async function reachModal(state: ElementState, { controls, settle }: Reaching): Promise<boolean> {
  if (state.selector !== '.modal-backdrop' || state.open !== true) return false;
  controls.set('open', true);
  await settle();
  if (state.classes?.['is-leaving'] === true) {
    controls.set('open', false);
    await settle();
  }
  return true;
}

async function reachLeavingToast(
  state: ElementState,
  { controls, settle }: Reaching,
): Promise<boolean> {
  if (state.selector !== '.toast' || state.classes?.['is-leaving'] !== true) return false;
  for (const toast of controls.toaster.toasts) controls.toaster.dismiss(toast.id);
  await settle();
  return true;
}

async function reachOpenDropdown(state: ElementState, { root, fire }: Reaching): Promise<boolean> {
  const wanted = state.classes?.['is-open'];
  if (state.selector !== '.dropdown' || wanted === undefined) return false;
  const open = root.querySelector('.dropdown')?.classList.contains('is-open') === true;
  if (open !== wanted) await fire({ event: 'click', target: '.dropdown-trigger', detail: 1 });
  return true;
}

async function reachSelectedTab(state: ElementState, { root, fire }: Reaching): Promise<boolean> {
  const tab = root.querySelector(state.selector);
  if (tab?.getAttribute('role') !== 'tab' || state.attributes?.['aria-selected'] !== 'true') {
    return false;
  }
  await fire({ event: 'click', target: state.selector });
  return true;
}

async function reachOpenPopover(state: ElementState, { fire }: Reaching): Promise<boolean> {
  if (state.selector !== '.popover' || state.open !== true) return false;
  await fire({ event: 'click', target: '[popovertarget]' });
  return true;
}

async function reachDragOver(state: ElementState, { fire }: Reaching): Promise<boolean> {
  if (state.selector !== '.dropzone' || state.classes?.['is-dragover'] !== true) return false;
  await fire({ event: 'dragenter', target: '.dropzone' });
  return true;
}

function forwardMarqueePointers(controls: RuleControls): () => void {
  const surface = controls.surface;
  if (surface === null) return () => {};
  const forwards = MARQUEE_POINTER_EVENTS.map((type) => {
    const forward = (event: PointerEvent): void => controls.marquee?.[type](event);
    surface.addEventListener(type, forward);
    return () => surface.removeEventListener(type, forward);
  });
  return () => {
    for (const stop of forwards) stop();
  };
}

function toastSubject(options: (controls: RuleControls) => ToastOptions): RuleSubject {
  return {
    render: subjects.toasts,
    prepare: (controls) => {
      controls.toaster.show(options(controls));
    },
    reach: reachLeavingToast,
  };
}

const RULE_SUBJECTS: Readonly<Record<string, RuleSubject>> = {
  'accordion-item/closed': { render: subjects.accordionItemClosed },
  'accordion-item/open': { render: subjects.accordionItemOpen },
  'carousel/default': { render: subjects.carouselDefault, layout: CAROUSEL_LAYOUT },
  'carousel/driven': { render: subjects.carouselDriven, layout: CAROUSEL_LAYOUT },
  'code-block/copy': { render: subjects.codeBlockCopy },
  'dock/sheet': { render: subjects.dockSheet, layout: DOCK_SHEET_LAYOUT },
  'dock/side': { render: subjects.dockSide },
  'dropdown/default': { render: subjects.dropdownDefault, reach: reachOpenDropdown },
  'dropzone/default': { render: subjects.dropzoneDefault, reach: reachDragOver },
  'dropzone/titled': { render: subjects.dropzoneTitled, reach: reachDragOver },
  'marquee-selection/idle': {
    render: subjects.marqueeSelectionIdle,
    connect: forwardMarqueePointers,
  },
  'modal/default': { render: subjects.modalDefault, reach: reachModal },
  'modal/footer': { render: subjects.modalFooter, reach: reachModal },
  'popover/default': { render: subjects.popoverDefault, reach: reachOpenPopover },
  'search-field/clearable-empty': {
    render: subjects.searchFieldClearableEmpty,
    coarsePointer: true,
  },
  'search-field/clearable-filled': {
    render: subjects.searchFieldClearableFilled,
    coarsePointer: true,
  },
  'tabs/disabled-tab': { render: subjects.tabsDisabledTab, reach: reachSelectedTab },
  'tabs/underline': { render: subjects.tabsUnderline, reach: reachSelectedTab },
  'toast-region/bottom': { render: subjects.toastRegionBottom },
  'toast/action': toastSubject((controls) => ({
    title: 'Book removed',
    action: { label: 'Undo', run: controls.record('action.run') },
  })),
  'toast/info': toastSubject(() => ({ title: 'Saved', variant: 'info' })),
  'toast/timed': toastSubject(() => ({ title: 'Saved', duration: 8000 })),
  'window-dropzone/idle': { render: subjects.windowDropzoneIdle },
};

export { RULE_SUBJECTS };
export type { Reaching, RuleSubject };
