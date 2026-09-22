import { resolveHref } from './epub-href';
import { attributeOf, descendantsNamed, firstNamed, parseXml } from './xml-document';
import type { XmlElement } from './xml-document';

type EpubSpine =
  | { readonly kind: 'spine'; readonly paths: readonly string[] }
  | { readonly kind: 'unreadable' }
  | { readonly kind: 'empty' }
  | { readonly kind: 'unmanifested'; readonly idref: string };

const PACKAGE_ELEMENT = 'package';

function manifestPaths(root: XmlElement, packagePath: string): ReadonlyMap<string, string> {
  const paths = new Map<string, string>();
  const manifest = firstNamed(root, 'manifest');
  if (manifest === null) return paths;

  for (const item of descendantsNamed(manifest, 'item')) {
    const id = attributeOf(item, 'id')?.trim();
    if (id === undefined || id === '') continue;
    if (paths.has(id)) continue;
    const path = resolveHref(packagePath, attributeOf(item, 'href') ?? '');
    if (path !== '') paths.set(id, path);
  }
  return paths;
}

function readEpubSpine(xml: string, packagePath: string): EpubSpine {
  const root = parseXml(xml);
  if (root === null || root.localName !== PACKAGE_ELEMENT) return { kind: 'unreadable' };

  const spine = firstNamed(root, 'spine');
  if (spine === null) return { kind: 'unreadable' };

  const manifest = manifestPaths(root, packagePath);
  const paths: string[] = [];
  for (const itemref of descendantsNamed(spine, 'itemref')) {
    const idref = attributeOf(itemref, 'idref')?.trim();
    if (idref === undefined || idref === '') continue;
    const path = manifest.get(idref);
    if (path === undefined) return { kind: 'unmanifested', idref };
    paths.push(path);
  }

  if (paths.length === 0) return { kind: 'empty' };
  return { kind: 'spine', paths };
}

export { readEpubSpine };
export type { EpubSpine };
