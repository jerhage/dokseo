import { resolveHref } from './epub-href';
import { attributeOf, descendantsNamed, parseXml } from './xml-document';
import type { XmlElement } from './xml-document';

type PageContent =
  | { readonly kind: 'one-image'; readonly path: string }
  | { readonly kind: 'no-image' }
  | { readonly kind: 'many-images'; readonly count: number }
  | { readonly kind: 'text-beside-the-image'; readonly path: string; readonly text: string };

const WORDLESS: ReadonlySet<string> = new Set(['head', 'title', 'script', 'style']);

const EXCERPT_LENGTH = 48;

function sourcesNamed(
  root: XmlElement,
  localName: string,
  attribute: string,
  pagePath: string,
): readonly string[] {
  const found: string[] = [];
  for (const element of descendantsNamed(root, localName)) {
    const path = resolveHref(pagePath, attributeOf(element, attribute) ?? '');
    if (path !== '') found.push(path);
  }
  return found;
}

function imageSources(root: XmlElement, pagePath: string): readonly string[] {
  return [
    ...sourcesNamed(root, 'img', 'src', pagePath),
    ...sourcesNamed(root, 'image', 'href', pagePath),
  ];
}

function pageText(root: XmlElement): string {
  const parts: string[] = [];
  const pending: XmlElement[] = [root];

  while (pending.length > 0) {
    const element = pending.pop();
    if (element === undefined) break;
    if (WORDLESS.has(element.localName)) continue;
    parts.push(element.text);
    for (let step = element.children.length - 1; step >= 0; step -= 1) {
      const child = element.children[step];
      if (child !== undefined) pending.push(child);
    }
  }

  return parts.join(' ').replaceAll(/\s+/gu, ' ').trim();
}

function excerptOf(text: string): string {
  if (text.length <= EXCERPT_LENGTH) return text;
  return `${text.slice(0, EXCERPT_LENGTH).trimEnd()}…`;
}

function readPageContent(xml: string, pagePath: string): PageContent {
  const root = parseXml(xml);
  if (root === null) return { kind: 'no-image' };

  const sources = imageSources(root, pagePath);
  const [only] = sources;
  if (only === undefined) return { kind: 'no-image' };
  if (sources.length > 1) return { kind: 'many-images', count: sources.length };

  const text = pageText(root);
  if (text !== '') return { kind: 'text-beside-the-image', path: only, text: excerptOf(text) };
  return { kind: 'one-image', path: only };
}

export { readPageContent };
export type { PageContent };
