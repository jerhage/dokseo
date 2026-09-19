import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import type { ImageIndex } from '$lib/shared/ids';
import { err, ok, type Result } from '$lib/shared/result';
import type { PageSource, PageSourceError } from '../domain/page-source';
import { describeCause } from '$lib/shared/cause';

const RENDER_SCALE = 2;

GlobalWorkerOptions.workerSrc = new URL(
	'pdfjs-dist/build/pdf.worker.min.mjs',
	import.meta.url
).href;

async function renderToBitmap(pdf: PDFDocumentProxy, pageNumber: number): Promise<ImageBitmap> {
	const page = await pdf.getPage(pageNumber);
	const viewport = page.getViewport({ scale: RENDER_SCALE });
	const canvas = new OffscreenCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
	const context = canvas.getContext('2d');
	if (context === null) throw new Error('A 2D drawing context was unavailable');
	await page.render({
		canvas: null,
		canvasContext: context as unknown as CanvasRenderingContext2D,
		viewport
	}).promise;
	return canvas.transferToImageBitmap();
}

export async function openPdfPageSource(
	source: Blob
): Promise<Result<PageSource, PageSourceError>> {
	let task: PDFDocumentLoadingTask;
	let pdf: PDFDocumentProxy;
	try {
		task = getDocument({ data: new Uint8Array(await source.arrayBuffer()) });
		pdf = await task.promise;
	} catch (cause) {
		return err({ kind: 'source-unreadable', cause: describeCause(cause) });
	}

	const count = pdf.numPages;
	let closed = false;

	const close = (): void => {
		if (closed) return;
		closed = true;
		void task.destroy().catch(() => undefined);
	};

	return ok({
		count,

		async image(index: ImageIndex): Promise<Result<ImageBitmap, PageSourceError>> {
			if (closed) return err({ kind: 'source-unreadable', cause: 'The document is closed' });
			if (!Number.isInteger(index) || index < 0 || index >= count) {
				return err({ kind: 'out-of-range', index, count });
			}
			try {
				const bitmap = await renderToBitmap(pdf, index + 1);
				return ok(bitmap);
			} catch (cause) {
				return err({ kind: 'decode-failed', index, cause: describeCause(cause) });
			}
		},

		close,
		[Symbol.dispose]: close
	});
}
