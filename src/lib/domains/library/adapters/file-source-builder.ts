import { renderThumbnail } from '$lib/platform/image/thumbnail';
import { describeCause } from '$lib/shared/cause';
import { imageIndex } from '$lib/shared/ids';
import { err, ok, type Result } from '$lib/shared/result';
import type { SourceKind } from '../domain/book';
import type { PageSource, PageSourceError } from '../domain/page-source';
import type { BuiltSource, SourceBuildError, SourceBuilder } from '../domain/source-builder';
import { detectSourceKind } from '../domain/source-detection';
import { packImagesIntoArchive } from './archive-packer';
import { openArchivePageSource } from './archive-page-source';
import { openPdfPageSource } from './pdf-page-source';

const COVER_MAX_WIDTH = 400;

const FALLBACK_TITLE = 'Untitled';

function entryName(file: File): string {
	return file.webkitRelativePath.length > 0 ? file.webkitRelativePath : file.name;
}

function basename(name: string): string {
	const cut = name.lastIndexOf('/');
	return cut === -1 ? name : name.slice(cut + 1);
}

function withoutExtension(name: string): string {
	const dot = name.lastIndexOf('.');
	return dot < 1 ? name : name.slice(0, dot);
}

function firstNonEmpty(...candidates: readonly string[]): string {
	for (const candidate of candidates) {
		const trimmed = candidate.trim();
		if (trimmed.length > 0) return trimmed;
	}
	return FALLBACK_TITLE;
}

function suggestTitle(files: readonly File[]): string {
	const first = files[0];
	if (files.length === 1) return firstNonEmpty(withoutExtension(basename(first.name)));
	const folder = first.webkitRelativePath.split('/')[0];
	return firstNonEmpty(folder, withoutExtension(basename(first.name)));
}

function describePageSourceError(error: PageSourceError): string {
	if (error.kind === 'out-of-range') {
		return `Image ${error.index} lies outside a source of ${error.count} images`;
	}
	return error.cause;
}

async function sourceBlobOf(
	sourceKind: SourceKind,
	files: readonly File[]
): Promise<Result<Blob, SourceBuildError>> {
	if (sourceKind !== 'images') return ok(files[0]);
	const packed = await packImagesIntoArchive(files);
	if (!packed.ok) return err({ kind: 'unreadable', cause: describePageSourceError(packed.error) });
	return packed;
}

function openPages(
	sourceKind: SourceKind,
	blob: Blob
): Promise<Result<PageSource, PageSourceError>> {
	return sourceKind === 'pdf' ? openPdfPageSource(blob) : openArchivePageSource(blob);
}

async function buildFrom(files: readonly File[]): Promise<Result<BuiltSource, SourceBuildError>> {
	const sourceKind = detectSourceKind(files.map(entryName));
	if (sourceKind === null) return err({ kind: 'nothing-usable' });

	const source = await sourceBlobOf(sourceKind, files);
	if (!source.ok) return source;

	const opened = await openPages(sourceKind, source.value);
	if (!opened.ok) return err({ kind: 'unreadable', cause: describePageSourceError(opened.error) });

	using pages = opened.value;
	if (pages.count === 0) return err({ kind: 'nothing-usable' });

	const first = await pages.image(imageIndex(0));
	if (!first.ok) return err({ kind: 'unreadable', cause: describePageSourceError(first.error) });

	let cover: Blob;
	try {
		cover = await renderThumbnail(first.value, COVER_MAX_WIDTH);
	} finally {
		first.value.close();
	}

	return ok({
		blob: source.value,
		sourceKind,
		imageCount: pages.count,
		cover,
		suggestedTitle: suggestTitle(files)
	});
}

export function createFileSourceBuilder(): SourceBuilder {
	return {
		async build(files: readonly File[]): Promise<Result<BuiltSource, SourceBuildError>> {
			if (files.length === 0) return err({ kind: 'empty' });
			try {
				const built = await buildFrom(files);
				return built;
			} catch (cause) {
				return err({ kind: 'unreadable', cause: describeCause(cause) });
			}
		}
	};
}
