import type { Snippet } from 'svelte';
import type { ToastOptions } from '../components/toaster.svelte';
import type { ElementState } from '../core/rules/schema.js';
import type { RuleControls } from './rule-controls.svelte';
import * as subjects from './RuleSubjects.svelte';

type Reaching = {
  readonly controls: RuleControls;
  readonly root: ParentNode;
  readonly settle: () => Promise<void>;
};

type RuleSubject = {
  readonly render: Snippet<[RuleControls]>;
  readonly prepare?: (controls: RuleControls) => void;
  readonly reach?: (state: ElementState, reaching: Reaching) => Promise<boolean>;
};

function clickOn(root: ParentNode, selector: string): void {
  root
    .querySelector(selector)
    ?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
}

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

async function reachOpenDropdown(
  state: ElementState,
  { root, settle }: Reaching,
): Promise<boolean> {
  const wanted = state.classes?.['is-open'];
  if (state.selector !== '.dropdown' || wanted === undefined) return false;
  const open = root.querySelector('.dropdown')?.classList.contains('is-open') === true;
  if (open !== wanted) {
    clickOn(root, '.dropdown-trigger');
    await settle();
  }
  return true;
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
  'carousel/default': { render: subjects.carouselDefault },
  'carousel/driven': { render: subjects.carouselDriven },
  'code-block/copy': { render: subjects.codeBlockCopy },
  'dock/sheet': { render: subjects.dockSheet },
  'dock/side': { render: subjects.dockSide },
  'dropdown/default': { render: subjects.dropdownDefault, reach: reachOpenDropdown },
  'dropzone/default': { render: subjects.dropzoneDefault },
  'dropzone/titled': { render: subjects.dropzoneTitled },
  'marquee-selection/idle': { render: subjects.marqueeSelectionIdle },
  'modal/default': { render: subjects.modalDefault, reach: reachModal },
  'modal/footer': { render: subjects.modalFooter, reach: reachModal },
  'popover/default': { render: subjects.popoverDefault },
  'search-field/clearable-empty': { render: subjects.searchFieldClearableEmpty },
  'search-field/clearable-filled': { render: subjects.searchFieldClearableFilled },
  'tabs/disabled-tab': { render: subjects.tabsDisabledTab },
  'tabs/underline': { render: subjects.tabsUnderline },
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
