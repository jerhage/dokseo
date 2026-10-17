import type { CatalogId } from '$lib/shared/ids';
import { LANGUAGES } from '$lib/shared/language';
import type { Language } from '$lib/shared/language';
import { LINE_BREAK, attributeOf, parseXml } from '$lib/shared/xml-document';
import type { XmlElement } from '$lib/shared/xml-document';
import { unknownTotal } from '$lib/shared/read-paged-state';
import type {
  FeedAddress,
  FeedPage,
  LinkEntry,
  NavigationLink,
  PublicationEntry,
  TrailStep,
} from '../../domain/catalog-feed';
import { formatOfMediaType, formatOfName } from '../../domain/remote-publication';
import { feedDialect } from './opds1-dialect';
import { childText, childrenNamed } from './opds1-elements';
import type {
  Acquisition,
  AcquisitionFormat,
  FeedPath,
  RemoteImage,
  RemotePublication,
} from '../../domain/remote-publication';

type OpdsFeedReading = FeedPage | { readonly kind: 'not-a-feed' };

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

function addressOf(href: string): FeedAddress {
  return { handle: href };
}

function nextOf(feed: XmlElement, base: string): FeedAddress | null {
  const next = resolvedLink(linksWithRel(feed, 'next')[0], base);
  return next === null ? null : addressOf(next);
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

const ESCAPED_BREAK = /<br\s*\/?>|<\/p\s*>|<\/div\s*>/giu;

const ESCAPED_TAG = /<\/?[a-z][a-z0-9]*(?:\s[^<>]*)?\/?>/giu;

function plainText(text: string): string {
  return text.replace(ESCAPED_BREAK, LINE_BREAK).replace(ESCAPED_TAG, '');
}

function summaryOf(entry: XmlElement): string {
  const body = childrenNamed(entry, 'content')[0] ?? childrenNamed(entry, 'summary')[0];
  return body === undefined ? '' : withBreaks(plainText(allText(body)));
}

function navigationLinkOf(entry: XmlElement, base: string): NavigationLink | null {
  const link = childrenNamed(entry, 'link').find((candidate) =>
    (attributeOf(candidate, 'type') ?? '').includes(CATALOG_PROFILE),
  );
  const href = resolvedLink(link, base);
  if (href === null) return null;
  return { title: childText(entry, 'title'), address: addressOf(href), summary: summaryOf(entry) };
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

function extensionOfHref(href: string): string {
  const [path = ''] = href.split(/[?#]/u);
  const last = path.split('/').findLast((segment) => segment !== '') ?? '';
  const dot = last.lastIndexOf('.');
  return dot === -1 ? '' : last.slice(dot + 1);
}

function formatOfLink(link: XmlElement, href: string): AcquisitionFormat | null {
  const mediaType = attributeOf(link, 'type');
  const declared = mediaType === null ? null : formatOfMediaType(mediaType);
  if (declared !== null) return declared;
  const titled = formatOfName(attributeOf(link, 'title') ?? '');
  if (titled !== null) return titled;
  return formatOfName(extensionOfHref(href));
}

function acquisitionsOf(entry: XmlElement, base: string): readonly Acquisition[] {
  const found: Acquisition[] = [];
  for (const link of childrenNamed(entry, 'link')) {
    const downloadable = relsOf(link).some(
      (rel) => isAcquisitionRel(rel) && !NON_DOWNLOAD_RELS.has(rel),
    );
    const href = resolvedLink(link, base);
    if (!downloadable || href === null) continue;
    const format = formatOfLink(link, href);
    if (format === null) continue;
    found.push({
      href,
      format,
      mediaType: attributeOf(link, 'type') ?? '',
      length: wholeNumber(attributeOf(link, 'length')),
    });
  }
  return found;
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
    acquisitions: acquisitionsOf(entry, base),
    feedPath: path,
  };
}

function storedPathOf(path: readonly TrailStep[]): FeedPath {
  return path.map((step) => ({ title: step.title, href: step.address?.handle ?? '' }));
}

function readOpdsFeed(
  xml: string,
  feedUrl: string,
  catalogId: CatalogId,
  trail: readonly TrailStep[],
): OpdsFeedReading {
  const path = storedPathOf(trail);
  const root = parseXml(xml, MAX_FEED_CHARACTERS, { lineBreaks: true });
  if (root === null || root.localName !== 'feed') return { kind: 'not-a-feed' };
  const entries = childrenNamed(root, 'entry');
  const dialect = feedDialect(root);
  const id = dialect.identifiesEachFeed ? childText(root, 'id') : '';
  const title = childText(root, 'title');
  const template = searchTemplateOf(root, feedUrl);
  const head = {
    id,
    title,
    address: addressOf(feedUrl),
    next: nextOf(root, feedUrl),
    search: template === null ? null : { handle: template },
    total: unknownTotal(),
  };
  if (entries.some(hasAcquisition)) {
    const items = entries.map((entry): PublicationEntry => ({
      kind: 'publication',
      publication: publicationOf(entry, feedUrl, catalogId, path),
    }));
    return { kind: 'acquisition', items, ...head };
  }
  const items = entries.flatMap((entry): LinkEntry[] => {
    const link = navigationLinkOf(entry, feedUrl);
    return link === null ? [] : [{ kind: 'link', link }];
  });
  return { kind: 'navigation', items, ...head };
}

export { MAX_FEED_CHARACTERS, SEARCH_PLACEHOLDER, readOpdsFeed };
export type { OpdsFeedReading };
