import { basename, extensionOf } from './entry-path';
import { compareNatural } from './natural-order';

const IMAGE_EXTENSIONS: ReadonlySet<string> = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'bmp',
  'avif',
]);

const JUNK_NAMES: ReadonlySet<string> = new Set(['thumbs.db', 'desktop.ini']);

const JUNK_FOLDER = '__MACOSX';

function isImageEntry(name: string): boolean {
  return IMAGE_EXTENSIONS.has(extensionOf(name));
}

function isHidden(segment: string): boolean {
  return segment.startsWith('.') && segment !== '.' && segment !== '..';
}

function isJunk(name: string): boolean {
  const segments = name.split('/');
  if (segments.includes(JUNK_FOLDER)) return true;
  if (segments.some(isHidden)) return true;
  return JUNK_NAMES.has(basename(name).toLowerCase());
}

function isDirectory(name: string): boolean {
  return name.endsWith('/');
}

function isPageImage(name: string): boolean {
  return !isDirectory(name) && !isJunk(name) && isImageEntry(name);
}

function selectImageEntries(names: readonly string[]): readonly string[] {
  return names.filter(isPageImage).toSorted(compareNatural);
}

export { isImageEntry, isJunk, isPageImage, selectImageEntries };
