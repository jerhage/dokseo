import type { Container } from '$lib/container';
import { storageEstimate } from '$lib/platform/storage/persistence';
import type { BookId } from '$lib/shared/ids';
import type { Book } from '../domain/book';
import type { LibraryError } from '../domain/library-repository';
import type { SourceBuildError } from '../domain/source-builder';
import { suggestTitle } from '../domain/title';
import type { OpenFileError } from '../use-cases/open-file';

export type LibraryStatus = 'idle' | 'loading' | 'ready' | 'failed';

export type StorageUsage = { readonly usage: number; readonly quota: number };

function describeLibraryError(error: LibraryError): string {
	if (error.kind === 'not-found') return 'That upload is no longer in your library.';
	if (error.kind === 'storage-unavailable') {
		return 'This browser blocks local storage, so uploads cannot be kept.';
	}
	if (error.kind === 'storage-failed') return `Local storage failed: ${error.cause}`;
	const unhandled: never = error;
	return unhandled;
}

function describeSourceBuildError(error: SourceBuildError): string {
	if (error.kind === 'nothing-usable') {
		return 'Nothing readable there. Drop images, a folder, a .zip, a .cbz or a .pdf.';
	}
	if (error.kind === 'unreadable') return `That upload could not be read: ${error.cause}`;
	if (error.kind === 'empty') return 'No files arrived, so there was nothing to add.';
	const unhandled: never = error;
	return unhandled;
}

function describeOpenFileError(error: OpenFileError): string {
	if (error.kind === 'source') return describeSourceBuildError(error.error);
	if (error.kind === 'storage') return describeLibraryError(error.error);
	const unhandled: never = error;
	return unhandled;
}

function revoke(urls: Iterable<string>): void {
	for (const url of urls) URL.revokeObjectURL(url);
}

function newestFirst(books: readonly Book[]): readonly Book[] {
	return [...books].sort((a, b) => b.addedAt - a.addedAt);
}

export class LibraryView {
	books = $state.raw<readonly Book[]>([]);
	covers = $state.raw<ReadonlyMap<BookId, string>>(new Map());
	status = $state<LibraryStatus>('idle');
	message = $state<string | null>(null);
	busy = $state(false);
	pending = $state.raw<string | null>(null);
	removing = $state.raw<BookId | null>(null);
	usage = $state.raw<StorageUsage | null>(null);

	#container: Container;
	#created = new Map<BookId, string>();
	#generation = 0;

	constructor(container: Container) {
		this.#container = container;
	}

	async load(): Promise<void> {
		const generation = ++this.#generation;
		this.status = 'loading';
		this.message = null;

		const listed = await this.#container.library.listBooks();
		if (generation !== this.#generation) return;
		if (!listed.ok) {
			this.status = 'failed';
			this.message = describeLibraryError(listed.error);
			return;
		}

		this.books = newestFirst(listed.value);
		this.status = 'ready';

		const covers = await this.#readCovers(this.books);
		if (generation !== this.#generation) {
			revoke(covers.values());
			return;
		}
		this.#adopt(covers);

		const estimate = await storageEstimate();
		if (generation !== this.#generation) return;
		this.usage = estimate;
	}

	async upload(files: readonly File[]): Promise<void> {
		if (files.length === 0) return;
		this.busy = true;
		this.message = null;
		this.pending = suggestTitle(
			files.map((file) => ({ name: file.name, path: file.webkitRelativePath }))
		);

		try {
			const opened = await this.#container.library.openFile(files);
			if (!opened.ok) {
				this.message = describeOpenFileError(opened.error);
				return;
			}
		} finally {
			this.busy = false;
			this.pending = null;
		}

		await this.load();
	}

	async remove(id: BookId): Promise<void> {
		if (this.removing !== null || this.busy) return;
		this.removing = id;
		this.message = null;

		try {
			const removed = await this.#container.library.removeBook(id);
			if (!removed.ok) {
				this.message = describeLibraryError(removed.error);
				return;
			}
		} finally {
			this.removing = null;
		}

		await this.load();
	}

	dispose(): void {
		this.#generation += 1;
		revoke(this.#created.values());
		this.#created = new Map();
		this.covers = new Map();
	}

	async #readCovers(books: readonly Book[]): Promise<Map<BookId, string>> {
		const read = books.map(async (book) => {
			const cover = await this.#container.library.readCover(book.id);
			return cover.ok ? ([book.id, URL.createObjectURL(cover.value)] as const) : null;
		});
		const found = await Promise.all(read);
		return new Map(found.filter((entry) => entry !== null));
	}

	#adopt(covers: Map<BookId, string>): void {
		revoke(this.#created.values());
		this.#created = covers;
		this.covers = new Map(covers);
	}
}
