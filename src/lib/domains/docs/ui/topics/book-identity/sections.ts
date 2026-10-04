import { anchorSlug } from '$lib/components/table-of-contents';

const IDENTITY_SECTIONS = {
  same: 'When two files are the same book',
  path: 'Identity by path or by content',
  sampling: 'Hashing every byte or a sample',
  partial: "KOReader's partial MD5",
  names: 'File names and titles as fallbacks',
  metadata: 'Titles from metadata',
  hash: "Dokseo's hash",
  folder: 'A folder of page images',
  record: 'What a book row keeps',
  ladder: 'The matching ladder',
  setting: 'The Match books by setting',
  playground: 'Trying the matchers',
  life: 'The life of a book',
  removed: 'A removed book keeps a record',
  unreadable: 'Rows Dokseo can no longer read',
  merge: 'Merging captures onto a held book',
  legacy: 'The old SHA-256 rows',
  rules: 'Rules Dokseo keeps',
} as const;

type IdentitySectionKey = keyof typeof IDENTITY_SECTIONS;

function identityHref(key: IdentitySectionKey): string {
  return `#${anchorSlug(IDENTITY_SECTIONS[key])}`;
}

export { IDENTITY_SECTIONS, identityHref };
export type { IdentitySectionKey };
