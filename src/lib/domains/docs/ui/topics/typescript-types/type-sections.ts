import { anchorSlug } from '$lib/ui/components/table-of-contents';
import { ARCHITECTURE_SECTIONS } from '../architecture/architecture-sections';
import { IDENTITY_SECTIONS } from '../book-identity/sections';
import { STORAGE_SECTIONS } from '../storage/storage-sections';
import { TOUCH_SECTIONS } from '../touch-and-pointers/sections';

const TYPE_SECTIONS = {
  structural: 'Structural typing',
  holes: 'Where structural typing lets a mistake through',
  unions: 'Union and intersection types',
  discriminated: 'Discriminated unions',
  narrowing: 'Narrowing',
  guards: 'Type guards and their risk',
  illegal: 'Making illegal states unrepresentable',
  exhaustive: 'Exhaustive checks with never and match',
  brands: 'Brands for ids and units',
  variance: 'The covariant brand hole',
  satisfies: 'as const and satisfies',
  readonly: 'readonly is shallow',
  unknown: 'unknown, any and the boundary',
  casts: 'An as cast is a claim',
  ids: 'The brands in shared/ids.ts',
  spaces: 'Screen and image rectangles',
  rows: 'Stored rows are unknown until checked',
  captures: 'A capture is a union on its origin',
  selection: 'How a selection ends',
  places: 'Reading places and anchors',
  loads: 'Load states from TanStack Query',
  korean: 'Korean in the Language union',
  imageKinds: 'A narrower union for image books',
  assertions: 'The two places Dokseo still asserts',
  rules: 'Rules for types in Dokseo',
} as const;

type TypeSectionKey = keyof typeof TYPE_SECTIONS;

function typeHref(key: TypeSectionKey): string {
  return `#${anchorSlug(TYPE_SECTIONS[key])}`;
}

const ARCHITECTURE_FAILURES_HREF = `/docs/architecture#${anchorSlug(ARCHITECTURE_SECTIONS.failures)}`;

const ARCHITECTURE_EXHAUSTIVE_HREF = `/docs/architecture#${anchorSlug(ARCHITECTURE_SECTIONS.exhaustive)}`;

const ARCHITECTURE_CASTS_HREF = `/docs/architecture#${anchorSlug(ARCHITECTURE_SECTIONS.casts)}`;

const ARCHITECTURE_QUERIES_HREF = `/docs/architecture#${anchorSlug(ARCHITECTURE_SECTIONS.queries)}`;

const ARCHITECTURE_LANGUAGES_HREF = `/docs/architecture#${anchorSlug(ARCHITECTURE_SECTIONS.languages)}`;

const STORAGE_ROWS_HREF = `/docs/storage#${anchorSlug(STORAGE_SECTIONS.rows)}`;

const IDENTITY_UNREADABLE_HREF = `/docs/book-identity#${anchorSlug(IDENTITY_SECTIONS.unreadable)}`;

const TOUCH_MARQUEE_HREF = `/docs/touch-and-pointers#${anchorSlug(TOUCH_SECTIONS.marquee)}`;

export {
  ARCHITECTURE_CASTS_HREF,
  ARCHITECTURE_EXHAUSTIVE_HREF,
  ARCHITECTURE_FAILURES_HREF,
  ARCHITECTURE_LANGUAGES_HREF,
  ARCHITECTURE_QUERIES_HREF,
  IDENTITY_UNREADABLE_HREF,
  STORAGE_ROWS_HREF,
  TOUCH_MARQUEE_HREF,
  TYPE_SECTIONS,
  typeHref,
};
export type { TypeSectionKey };
