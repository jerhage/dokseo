import { basename, extensionOf } from './entry-path';
import { compareNatural } from './natural-order';

const IMAGE_EXTENSIONS: readonly string[] = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'avif'];

const JUNK_NAMES: readonly string[] = ['.ds_store', 'thumbs.db'];

export function isImageEntry(name: string): boolean {
	return IMAGE_EXTENSIONS.includes(extensionOf(name));
}

function isJunk(name: string): boolean {
	if (name.split('/').includes('__MACOSX')) return true;
	const last = basename(name);
	return last.startsWith('._') || JUNK_NAMES.includes(last.toLowerCase());
}

function isDirectory(name: string): boolean {
	return name.endsWith('/');
}

export function selectImageEntries(names: readonly string[]): readonly string[] {
	const images = names.filter((name) => !isDirectory(name) && !isJunk(name) && isImageEntry(name));
	return images.sort(compareNatural);
}
