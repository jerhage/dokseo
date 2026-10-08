import type { CatalogId } from '$lib/shared/ids';
import { LANGUAGES } from '$lib/shared/language';
import type { Language } from '$lib/shared/language';
import { LINE_BREAK, attributeOf, parseXml } from '$lib/shared/xml-document';
import type { XmlElement } from '$lib/shared/xml-document';
import type { CatalogFeed, FeedPaging, NavigationLink } from '../../domain/catalog-feed';
import { formatOfMediaType } from '../../domain/remote-publication';
import type {
  Acquisition,
  FeedPath,
  RemoteImage,
  RemotePublication,
} from '../../domain/remote-publication';

type OpdsFeedReading = CatalogFeed | { readonly kind: 'not-a-feed' };

const MAX_FEED_CHARACTERS = 2_000_000;

const ACQUISITION_REL = 'http://opds-spec.org/acquisition';
const IMAGE_REL = 'http://opds-spec.org/image';
const COVER_REL = 'http://opds-spec.org/cover';
const NON_DOWNLOAD_RELS: ReadonlySet<string> = new Set(
  ['buy', 'borrow', 'subscribe', 'sample'].map((suffix) => `${ACQUISITION_REL}/${suffix}`),
);
const SEARCH_PLACEHOLDER = '{searchTerms}';
const ENCODED_SEARCH_PLACEHOLDER = /%7BsearchTerms%7D/giu;
const THREE_LETTER_LANGUAGES: ReadonlyMap<string, string> = new Map([
  ['jpn', 'ja'],
  ['kor', 'ko'],
  ['eng', 'en'],
]);
const CATALOG_PROFILE = 'profile=opds-catalog';

function childrenNamed(element: XmlElement, localName: string): readonly XmlElement[] {
  return element.children.filter((child) => child.localName === localName);
}

function childText(element: XmlElement, localName: string): string {
  return childrenNamed(element, localName)[0]?.text.trim() ?? '';
}

function allText(element: XmlElement): string {
  return element.text + element.children.map(allText).join('');
}

function collapsed(text: string): string {
  return text.replace(/\s+/gu, ' ').trim();
}

function withBreaks(text: string): string {
  return text
    .split(LINE_BREAK)
    .map(collapsed)
    .join('\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim();
}

function resolved(href: string, base: string): string | null {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

function relsOf(link: XmlElement): readonly string[] {
  return (attributeOf(link, 'rel') ?? '').split(/\s+/u).filter((rel) => rel !== '');
}

function linksWithRel(element: XmlElement, rel: string): readonly XmlElement[] {
  return childrenNamed(element, 'link').filter((link) => relsOf(link).includes(rel));
}

function resolvedLink(link: XmlElement | undefined, base: string): string | null {
  const href = link === undefined ? null : attributeOf(link, 'href');
  return href === null ? null : resolved(href, base);
}

function pagingOf(feed: XmlElement, base: string): FeedPaging {
  const target = (rel: string): string | null => resolvedLink(linksWithRel(feed, rel)[0], base);
  return {
    next: target('next'),
    previous: target('previous'),
    first: target('first'),
    last: target('last'),
  };
}

function searchTemplateOf(feed: XmlElement, base: string): string | null {
  for (const link of linksWithRel(feed, 'search')) {
    const href = attributeOf(link, 'href');
    if (href === null || !href.includes(SEARCH_PLACEHOLDER)) continue;
    const target = resolved(href, base);
    if (target !== null) return target.replace(ENCODED_SEARCH_PLACEHOLDER, SEARCH_PLACEHOLDER);
  }
  return null;
}

function isAcquisitionRel(rel: string): boolean {
  return rel === ACQUISITION_REL || rel.startsWith(`${ACQUISITION_REL}/`);
}

function hasAcquisition(entry: XmlElement): boolean {
  return childrenNamed(entry, 'link').some((link) => relsOf(link).some(isAcquisitionRel));
}

function summaryOf(entry: XmlElement): string {
  const body = childrenNamed(entry, 'content')[0] ?? childrenNamed(entry, 'summary')[0];
  return body === undefined ? '' : withBreaks(allText(body));
}

function navigationLinkOf(entry: XmlElement, base: string): NavigationLink | null {
  const link = childrenNamed(entry, 'link').find((candidate) =>
    (attributeOf(candidate, 'type') ?? '').includes(CATALOG_PROFILE),
  );
  const href = resolvedLink(link, base);
  if (href === null) return null;
  return { title: childText(entry, 'title'), href, summary: summaryOf(entry) };
}

function declaredLanguage(tag: string): Language | null {
  const [primary] = tag.trim().toLowerCase().split(/[-_]/u);
  const code = THREE_LETTER_LANGUAGES.get(primary ?? '') ?? primary;
  return LANGUAGES.find((known) => known === code) ?? null;
}

function wholeNumber(raw: string | null): number | null {
  if (raw === null || !/^\d+$/u.test(raw.trim())) return null;
  return Number.parseInt(raw.trim(), 10);
}

function coverOf(entry: XmlElement, base: string): RemoteImage | null {
  const link = linksWithRel(entry, IMAGE_REL)[0] ?? linksWithRel(entry, COVER_REL)[0];
  const href = resolvedLink(link, base);
  if (link === undefined || href === null) return null;
  return { href, mediaType: attributeOf(link, 'type') };
}

function acquisitionOf(entry: XmlElement, base: string): Acquisition | null {
  for (const link of childrenNamed(entry, 'link')) {
    const downloadable = relsOf(link).some(
      (rel) => isAcquisitionRel(rel) && !NON_DOWNLOAD_RELS.has(rel),
    );
    const mediaType = attributeOf(link, 'type');
    const href = resolvedLink(link, base);
    if (!downloadable || mediaType === null || href === null) continue;
    const format = formatOfMediaType(mediaType);
    if (format === null) continue;
    return { href, format, mediaType, length: wholeNumber(attributeOf(link, 'length')) };
  }
  return null;
}

function authorsOf(entry: XmlElement): readonly string[] {
  return childrenNamed(entry, 'author')
    .map((author) => childText(author, 'name'))
    .filter((name) => name !== '');
}

function publicationOf(
  entry: XmlElement,
  base: string,
  catalogId: CatalogId,
  path: FeedPath,
): RemotePublication {
  return {
    catalogId,
    entryId: childText(entry, 'id'),
    title: childText(entry, 'title'),
    authors: authorsOf(entry),
    language: declaredLanguage(childText(entry, 'language')),
    summary: summaryOf(entry),
    updated: childText(entry, 'updated'),
    cover: coverOf(entry, base),
    acquisition: acquisitionOf(entry, base),
    feedPath: path,
  };
}

function readOpdsFeed(
  xml: string,
  feedUrl: string,
  catalogId: CatalogId,
  path: FeedPath,
): OpdsFeedReading {
  const root = parseXml(xml, MAX_FEED_CHARACTERS, { lineBreaks: true });
  if (root === null || root.localName !== 'feed') return { kind: 'not-a-feed' };
  const entries = childrenNamed(root, 'entry');
  const id = childText(root, 'id');
  const title = childText(root, 'title');
  const paging = pagingOf(root, feedUrl);
  const template = searchTemplateOf(root, feedUrl);
  const search = template === null ? null : { handle: template };
  if (entries.some(hasAcquisition)) {
    const publications = entries.map((entry) => publicationOf(entry, feedUrl, catalogId, path));
    return {
      kind: 'acquisition',
      feed: { id, title, address: feedUrl, paging, search, publications },
    };
  }
  const links = entries.flatMap((entry) => navigationLinkOf(entry, feedUrl) ?? []);
  return { kind: 'navigation', feed: { id, title, address: feedUrl, paging, search, links } };
}

export { MAX_FEED_CHARACTERS, SEARCH_PLACEHOLDER, readOpdsFeed };
export type { OpdsFeedReading };
