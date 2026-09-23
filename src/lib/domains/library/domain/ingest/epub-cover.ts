import { resolveHref } from './epub-href';
import { attributeOf, descendantsNamed, firstNamed, parseXml } from './xml-document';
import type { XmlElement } from './xml-document';

type CoverImage = {
  readonly path: string;
  readonly mediaType: string;
};

const PACKAGE_ELEMENT = 'package';

const COVER_IMAGE_PROPERTY = 'cover-image';

const COVER_META_NAME = 'cover';

const IMAGE_MEDIA_TYPE = 'image/';

function propertiesOf(item: XmlElement): readonly string[] {
  return (attributeOf(item, 'properties') ?? '').split(/\s+/).filter((property) => property !== '');
}

function manifestItems(root: XmlElement): readonly XmlElement[] {
  const manifest = firstNamed(root, 'manifest');
  return manifest === null ? [] : descendantsNamed(manifest, 'item');
}

function coverImageOf(item: XmlElement, packagePath: string): CoverImage | null {
  const mediaType = attributeOf(item, 'media-type')?.trim().toLowerCase() ?? '';
  if (!mediaType.startsWith(IMAGE_MEDIA_TYPE)) return null;
  const path = resolveHref(packagePath, attributeOf(item, 'href') ?? '');
  if (path === '') return null;
  return { path, mediaType };
}

function markedCoverImage(items: readonly XmlElement[], packagePath: string): CoverImage | null {
  for (const item of items) {
    if (!propertiesOf(item).includes(COVER_IMAGE_PROPERTY)) continue;
    const cover = coverImageOf(item, packagePath);
    if (cover !== null) return cover;
  }
  return null;
}

function coverItemId(root: XmlElement): string | null {
  const metadata = firstNamed(root, 'metadata') ?? root;
  for (const meta of descendantsNamed(metadata, 'meta')) {
    if (attributeOf(meta, 'name')?.trim().toLowerCase() !== COVER_META_NAME) continue;
    const id = attributeOf(meta, 'content')?.trim() ?? '';
    if (id !== '') return id;
  }
  return null;
}

function namedCoverImage(
  root: XmlElement,
  items: readonly XmlElement[],
  packagePath: string,
): CoverImage | null {
  const id = coverItemId(root);
  if (id === null) return null;
  for (const item of items) {
    if (attributeOf(item, 'id')?.trim() !== id) continue;
    return coverImageOf(item, packagePath);
  }
  return null;
}

function readEpubCover(xml: string, packagePath: string): CoverImage | null {
  const root = parseXml(xml);
  if (root === null || root.localName !== PACKAGE_ELEMENT) return null;

  const items = manifestItems(root);
  return markedCoverImage(items, packagePath) ?? namedCoverImage(root, items, packagePath);
}

export { readEpubCover };
export type { CoverImage };
