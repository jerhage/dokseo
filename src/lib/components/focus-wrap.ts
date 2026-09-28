const TAB_STOP_SELECTOR = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled):not([type="hidden"])',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  'summary',
  '[tabindex]',
  '[contenteditable="true"]',
].join(', ');

function isTabStop(element: Element): element is HTMLElement {
  if (!(element instanceof HTMLElement) || element.tabIndex < 0) return false;
  if (element instanceof HTMLInputElement && element.type === 'radio' && !element.checked) {
    return false;
  }
  return element.checkVisibility();
}

function tabStops(root: Element): HTMLElement[] {
  return [...root.querySelectorAll(TAB_STOP_SELECTOR)].filter(isTabStop);
}

function wrappedStop(stops: number, current: number, backwards: boolean): number | null {
  if (stops === 0 || current < 0) return null;
  if (backwards) return current === 0 ? stops - 1 : null;
  return current === stops - 1 ? 0 : null;
}

export { TAB_STOP_SELECTOR, tabStops, wrappedStop };
