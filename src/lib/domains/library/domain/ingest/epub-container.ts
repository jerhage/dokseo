import { attributeOf, descendantsNamed, parseXml } from './xml-document';

const CONTAINER_ENTRY = 'META-INF/container.xml';

const PACKAGE_MEDIA_TYPE = 'application/oebps-package+xml';

function entryPath(raw: string): string {
  const trimmed = raw.trim();
  const rooted = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
  return rooted.startsWith('./') ? rooted.slice(2) : rooted;
}

function packagePathFromContainer(xml: string): string | null {
  const root = parseXml(xml);
  if (root === null) return null;
  for (const rootfile of descendantsNamed(root, 'rootfile')) {
    const mediaType = attributeOf(rootfile, 'media-type');
    if (mediaType !== null && mediaType.trim() !== PACKAGE_MEDIA_TYPE) continue;
    const path = entryPath(attributeOf(rootfile, 'full-path') ?? '');
    if (path !== '') return path;
  }
  return null;
}

export { CONTAINER_ENTRY, packagePathFromContainer };
