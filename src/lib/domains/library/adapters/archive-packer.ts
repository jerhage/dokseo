import { BlobReader, BlobWriter, ZipWriter } from '@zip.js/zip.js';
import { err, ok, type Result } from '$lib/shared/result';
import { isImageEntry } from '../domain/image-entries';
import type { PageSourceError } from '../domain/page-source';
import { describeCause } from '$lib/shared/cause';

function entryName(file: File): string {
	return file.webkitRelativePath.length > 0 ? file.webkitRelativePath : file.name;
}

export async function packImagesIntoArchive(
	files: readonly File[]
): Promise<Result<Blob, PageSourceError>> {
	const images = files.filter((file) => isImageEntry(entryName(file)));
	if (images.length === 0) {
		return err({ kind: 'source-unreadable', cause: 'No image files were found' });
	}

	const writer = new ZipWriter(new BlobWriter('application/zip'));
	try {
		for (const file of images) {
			await writer.add(entryName(file), new BlobReader(file), { level: 0 });
		}
		return ok(await writer.close());
	} catch (cause) {
		await writer.close().catch(() => undefined);
		return err({ kind: 'source-unreadable', cause: describeCause(cause) });
	}
}
