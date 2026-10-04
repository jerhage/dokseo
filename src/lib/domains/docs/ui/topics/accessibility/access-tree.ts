import { accessReading } from '../../../domain/accessible-name';
import type { AccessElement, AccessNode, AccessReading } from '../../../domain/accessible-name';

type BrowserReading =
  | { readonly kind: 'exposed'; readonly role: string; readonly name: string }
  | { readonly kind: 'unavailable' };

function isHidden(element: Element): boolean {
  if (element.getAttribute('aria-hidden') === 'true') return true;
  if (element.closest('[inert]') !== null) return true;
  return !element.checkVisibility();
}

function attributesOf(element: Element): Record<string, string> {
  return Object.fromEntries([...element.attributes].map((held) => [held.name, held.value]));
}

function isFocusable(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return false;
  if (element.hasAttribute('disabled')) return false;
  return element.tabIndex >= 0;
}

function labelsOf(element: Element): readonly Element[] {
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLButtonElement
  ) {
    return [...(element.labels ?? [])];
  }
  return [];
}

function referenced(element: Element, attribute: string): readonly Element[] {
  const ids = (element.getAttribute(attribute) ?? '').split(/\s+/u).filter((id) => id !== '');
  return ids.flatMap((id) => {
    const found = element.ownerDocument.getElementById(id);
    return found === null ? [] : [found];
  });
}

function childNodes(element: Element): readonly AccessNode[] {
  return [...element.childNodes].flatMap((child): AccessNode[] => {
    if (child instanceof Text) return [{ kind: 'text', text: child.data }];
    if (child instanceof Element) return [plainNode(child)];
    return [];
  });
}

function plainNode(element: Element): AccessElement {
  return {
    kind: 'element',
    tag: element.localName,
    attributes: attributesOf(element),
    hidden: isHidden(element),
    focusable: isFocusable(element),
    children: childNodes(element),
    labels: [],
    labelledBy: [],
    describedBy: [],
  };
}

function accessNode(element: Element): AccessElement {
  return {
    ...plainNode(element),
    labels: labelsOf(element).map(plainNode),
    labelledBy: referenced(element, 'aria-labelledby').map(plainNode),
    describedBy: referenced(element, 'aria-describedby').map(plainNode),
  };
}

function readElement(element: Element): AccessReading {
  return accessReading(accessNode(element));
}

function browserReading(element: Element): BrowserReading {
  if (!('computedRole' in element) || !('computedName' in element)) return { kind: 'unavailable' };
  const role = element.computedRole;
  const name = element.computedName;
  if (typeof role !== 'string' && role !== null) return { kind: 'unavailable' };
  if (typeof name !== 'string' && name !== null) return { kind: 'unavailable' };
  return { kind: 'exposed', role: role ?? '', name: name ?? '' };
}

function browserExposesReadings(): boolean {
  return 'computedRole' in Element.prototype && 'computedName' in Element.prototype;
}

export { browserExposesReadings, browserReading, readElement };
export type { BrowserReading };
