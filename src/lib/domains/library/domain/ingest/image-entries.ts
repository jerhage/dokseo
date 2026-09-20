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

const JUNK_NAMES: ReadonlySet<string> = new Set(['.ds_store', 'thumbs.db']);

function isImageEntry(name: string): boolean {
  return IMAGE_EXTENSIONS.has(extensionOf(name));
}

function isJunk(name: string): boolean {
  if (name.split('/').includes('__MACOSX')) return true;
  const last = basename(name);
  return last.startsWith('._') || JUNK_NAMES.has(last.toLowerCase());
}

function isDirectory(name: string): boolean {
  return name.endsWith('/');
}

function selectImageEntries(names: readonly string[]): readonly string[] {
  const images = names.filter((name) => !isDirectory(name) && !isJunk(name) && isImageEntry(name));
  return images.toSorted(compareNatural);
}

export { isImageEntry, selectImageEntries };
