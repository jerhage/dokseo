import type { XmlElement } from '$lib/shared/xml-document';

function childrenNamed(element: XmlElement, localName: string): readonly XmlElement[] {
  return element.children.filter((child) => child.localName === localName);
}

function childText(element: XmlElement, localName: string): string {
  return childrenNamed(element, localName)[0]?.text.trim() ?? '';
}

export { childText, childrenNamed };
