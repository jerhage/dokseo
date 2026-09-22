import { attributeOf, descendantsNamed, firstNamed, parseXml } from './xml-document';
import type { XmlElement } from './xml-document';

type EpubLayout = 'pre-paginated' | 'reflowable';

type SpineDirection = 'rtl' | 'ltr' | 'default';

type EpubPackage = {
  readonly layout: EpubLayout;
  readonly direction: SpineDirection;
  readonly title: string | null;
  readonly language: string | null;
};

const PACKAGE_ELEMENT = 'package';

const LAYOUT_PROPERTY = 'rendition:layout';

const FIXED_LAYOUT = 'pre-paginated';

function layoutOf(metadata: XmlElement): EpubLayout {
  for (const meta of descendantsNamed(metadata, 'meta')) {
    const property = attributeOf(meta, 'property');
    if (property === null || property.trim() !== LAYOUT_PROPERTY) continue;
    if (meta.text.trim() === FIXED_LAYOUT) return 'pre-paginated';
  }
  return 'reflowable';
}

function directionOf(root: XmlElement): SpineDirection {
  const spine = firstNamed(root, 'spine');
  if (spine === null) return 'default';
  const direction = attributeOf(spine, 'page-progression-direction')?.trim().toLowerCase();
  if (direction === 'rtl') return 'rtl';
  if (direction === 'ltr') return 'ltr';
  return 'default';
}

function textNamed(metadata: XmlElement, localName: string): string | null {
  const element = firstNamed(metadata, localName);
  if (element === null) return null;
  const text = element.text.trim();
  return text === '' ? null : text;
}

function readEpubPackage(xml: string): EpubPackage | null {
  const root = parseXml(xml);
  if (root === null || root.localName !== PACKAGE_ELEMENT) return null;
  const metadata = firstNamed(root, 'metadata') ?? root;
  return {
    layout: layoutOf(metadata),
    direction: directionOf(root),
    title: textNamed(metadata, 'title'),
    language: textNamed(metadata, 'language'),
  };
}

export { readEpubPackage };
export type { EpubLayout, EpubPackage, SpineDirection };
