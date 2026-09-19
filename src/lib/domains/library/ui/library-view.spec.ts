import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Container } from '$lib/container';
import { bookId, imageIndex } from '$lib/shared/ids';
import { err, ok, type Result } from '$lib/shared/result';
import type { Book } from '../domain/book';
import type { LibraryError } from '../domain/library-repository';
import type { OpenFileError } from '../use-cases/open-file';
import { LibraryView } from './library-view.svelte';

type Deferred<T> = { readonly promise: Promise<T>; readonly settle: (value: T) => void };

function deferred<T>(): Deferred<T> {
	let settle: (value: T) => void = () => undefined;
	const promise = new Promise<T>((resolve) => {
		settle = resolve;
	});
	return { promise, settle };
}

function book(id: string, overrides: Partial<Book> = {}): Book {
	return {
		id: bookId(id),
		title: id,
		language: 'ja',
		layoutKind: 'paged',
		direction: 'rtl',
		sourceKind: 'archive',
		imageCount: 182,
		addedAt: 1758240000000,
		position: imageIndex(13),
		...overrides
	};
}

type CoverState = {
	outcome: Result<Blob, LibraryError>;
	gate: () => Promise<void>;
};

type Fakes = {
	readonly container: Container;
	readonly lists: Deferred<Result<readonly Book[], LibraryError>>[];
	readonly opens: Deferred<Result<Book, OpenFileError>>[];
	readonly removes: Deferred<Result<void, LibraryError>>[];
	readonly cover: CoverState;
};

function fakes(): Fakes {
	const lists: Deferred<Result<readonly Book[], LibraryError>>[] = [];
	const opens: Deferred<Result<Book, OpenFileError>>[] = [];
	const removes: Deferred<Result<void, LibraryError>>[] = [];
	const cover: CoverState = { outcome: ok(new Blob(['cover'])), gate: () => Promise.resolve() };

	const container: Container = {
		library: {
			openFile: () => {
				const next = deferred<Result<Book, OpenFileError>>();
				opens.push(next);
				return next.promise;
			},
			listBooks: () => {
				const next = deferred<Result<readonly Book[], LibraryError>>();
				lists.push(next);
				return next.promise;
			},
			readCover: () => cover.gate().then(() => cover.outcome),
			removeBook: () => {
				const next = deferred<Result<void, LibraryError>>();
				removes.push(next);
				return next.promise;
			}
		}
	};

	return { container, lists, opens, removes, cover };
}

function chosen(name: string, path = ''): File {
	const file = new File(['x'], name);
	Object.defineProperty(file, 'webkitRelativePath', { value: path });
	return file;
}

async function settleMicrotasks(): Promise<void> {
	for (let turn = 0; turn < 8; turn += 1) await Promise.resolve();
}

let created: string[] = [];
let revoked: string[] = [];
let originalCreate: typeof URL.createObjectURL | undefined;
let originalRevoke: typeof URL.revokeObjectURL | undefined;

beforeEach(() => {
	created = [];
	revoked = [];
	originalCreate = URL.createObjectURL;
	originalRevoke = URL.revokeObjectURL;
	URL.createObjectURL = () => {
		const url = `blob:cover-${created.length + 1}`;
		created.push(url);
		return url;
	};
	URL.revokeObjectURL = (url: string) => {
		revoked.push(url);
	};
});

afterEach(() => {
	URL.createObjectURL = originalCreate as typeof URL.createObjectURL;
	URL.revokeObjectURL = originalRevoke as typeof URL.revokeObjectURL;
});

describe('LibraryView', () => {
	it('moves from idle to loading to ready and exposes the books', async () => {
		const world = fakes();
		const view = new LibraryView(world.container);
		expect(view.status).toBe('idle');

		const running = view.load();
		expect(view.status).toBe('loading');

		world.lists[0].settle(ok([book('one'), book('two')]));
		await running;

		expect(view.status).toBe('ready');
		expect(view.books.map((b) => b.id)).toEqual(['one', 'two']);
		expect(view.covers.size).toBe(2);
		expect(view.message).toBeNull();
	});

	it('orders the newest upload first', async () => {
		const world = fakes();
		const view = new LibraryView(world.container);

		const running = view.load();
		world.lists[0].settle(ok([book('older', { addedAt: 1 }), book('newer', { addedAt: 2 })]));
		await running;

		expect(view.books.map((b) => b.id)).toEqual(['newer', 'older']);
	});

	it('lands a repository failure in the failed status without throwing', async () => {
		const world = fakes();
		const view = new LibraryView(world.container);

		const running = view.load();
		world.lists[0].settle(err({ kind: 'storage-failed', cause: 'quota exceeded' }));
		await expect(running).resolves.toBeUndefined();

		expect(view.status).toBe('failed');
		expect(view.message).toBe('Local storage failed: quota exceeded');
		expect(view.books).toEqual([]);
	});

	it('keeps a book whose cover cannot be read', async () => {
		const world = fakes();
		world.cover.outcome = err({ kind: 'not-found', id: bookId('one') });
		const view = new LibraryView(world.container);

		const running = view.load();
		world.lists[0].settle(ok([book('one')]));
		await running;

		expect(view.status).toBe('ready');
		expect(view.books).toHaveLength(1);
		expect(view.covers.size).toBe(0);
	});

	it('revokes every object URL it created when disposed', async () => {
		const world = fakes();
		const view = new LibraryView(world.container);

		const running = view.load();
		world.lists[0].settle(ok([book('one'), book('two')]));
		await running;

		view.dispose();

		expect(revoked).toEqual(created);
		expect(view.covers.size).toBe(0);
	});

	it('revokes the replaced object URLs on a second load', async () => {
		const world = fakes();
		const view = new LibraryView(world.container);

		const first = view.load();
		world.lists[0].settle(ok([book('one')]));
		await first;

		const second = view.load();
		world.lists[1].settle(ok([book('one')]));
		await second;

		expect(revoked).toEqual([created[0]]);
		expect(view.covers.get(bookId('one'))).toBe(created[1]);
	});

	it('lets the later of two overlapping loads win', async () => {
		const world = fakes();
		const view = new LibraryView(world.container);

		const first = view.load();
		const second = view.load();

		world.lists[1].settle(ok([book('late')]));
		await second;
		world.lists[0].settle(ok([book('early')]));
		await first;

		expect(view.books.map((b) => b.id)).toEqual(['late']);
		expect(view.status).toBe('ready');
	});

	it('revokes the covers a stale load created', async () => {
		const world = fakes();
		const view = new LibraryView(world.container);
		const held = deferred<void>();
		world.cover.gate = () => held.promise;

		const first = view.load();
		world.lists[0].settle(ok([book('early')]));
		await settleMicrotasks();

		world.cover.gate = () => Promise.resolve();
		const second = view.load();
		world.lists[1].settle(ok([book('late')]));
		await second;

		held.settle();
		await first;

		expect(view.books.map((b) => b.id)).toEqual(['late']);
		expect(view.covers.size).toBe(1);
		expect(revoked).toEqual([created[1]]);
	});

	it('reports an upload failure and keeps the books it already has', async () => {
		const world = fakes();
		const view = new LibraryView(world.container);

		const loading = view.load();
		world.lists[0].settle(ok([book('one')]));
		await loading;

		const uploading = view.upload([chosen('page.png')]);
		expect(view.busy).toBe(true);

		world.opens[0].settle(err({ kind: 'source', error: { kind: 'nothing-usable' } }));
		await expect(uploading).resolves.toBeUndefined();

		expect(view.busy).toBe(false);
		expect(view.message).toBe(
			'Nothing readable there. Drop images, a folder, a .zip, a .cbz or a .pdf.'
		);
		expect(view.books.map((b) => b.id)).toEqual(['one']);
		expect(view.status).toBe('ready');
	});

	it('reloads the library after a successful upload', async () => {
		const world = fakes();
		const view = new LibraryView(world.container);

		const loading = view.load();
		world.lists[0].settle(ok([book('one')]));
		await loading;

		const uploading = view.upload([chosen('page.png')]);
		world.opens[0].settle(ok(book('two')));
		await Promise.resolve();
		await Promise.resolve();
		world.lists[1].settle(ok([book('one'), book('two')]));
		await uploading;

		expect(view.books.map((b) => b.id)).toEqual(['one', 'two']);
		expect(view.message).toBeNull();
	});

	it('sets the pending title while the upload runs and clears it afterwards', async () => {
		const world = fakes();
		const view = new LibraryView(world.container);

		const loading = view.load();
		world.lists[0].settle(ok([book('one')]));
		await loading;

		const uploading = view.upload([chosen('001.png', 'Blame/001.png')]);
		expect(view.pending).toBe('Blame');

		world.opens[0].settle(ok(book('two')));
		await settleMicrotasks();
		expect(view.pending).toBeNull();

		world.lists[1].settle(ok([book('one'), book('two')]));
		await uploading;

		expect(view.pending).toBeNull();
		expect(view.books.map((b) => b.id)).toEqual(['one', 'two']);
	});

	it('clears the pending title when the upload fails', async () => {
		const world = fakes();
		const view = new LibraryView(world.container);

		const uploading = view.upload([chosen('chapter-1.cbz')]);
		expect(view.pending).toBe('chapter-1');

		world.opens[0].settle(err({ kind: 'source', error: { kind: 'unreadable', cause: 'bad zip' } }));
		await uploading;

		expect(view.pending).toBeNull();
		expect(view.message).toBe('That upload could not be read: bad zip');
	});

	it('reports no pending title before any upload', () => {
		const world = fakes();
		const view = new LibraryView(world.container);

		expect(view.pending).toBeNull();
	});

	it('ignores an upload with no files', async () => {
		const world = fakes();
		const view = new LibraryView(world.container);

		await view.upload([]);

		expect(world.opens).toHaveLength(0);
		expect(view.busy).toBe(false);
	});

	it('removes a book and reloads the list', async () => {
		const world = fakes();
		const view = new LibraryView(world.container);

		const loading = view.load();
		world.lists[0].settle(ok([book('one'), book('two')]));
		await loading;

		const removing = view.remove(bookId('one'));
		world.removes[0].settle(ok(undefined));
		await settleMicrotasks();
		world.lists[1].settle(ok([book('two')]));
		await removing;

		expect(view.books.map((b) => b.id)).toEqual(['two']);
		expect(view.status).toBe('ready');
		expect(view.message).toBeNull();
	});

	it('sets removing while the call runs and clears it afterwards', async () => {
		const world = fakes();
		const view = new LibraryView(world.container);

		const loading = view.load();
		world.lists[0].settle(ok([book('one'), book('two')]));
		await loading;

		const removing = view.remove(bookId('one'));
		expect(view.removing).toBe('one');

		world.removes[0].settle(ok(undefined));
		await settleMicrotasks();
		expect(view.removing).toBeNull();

		world.lists[1].settle(ok([book('two')]));
		await removing;

		expect(view.removing).toBeNull();
	});

	it('clears removing and reports a message when the repository fails', async () => {
		const world = fakes();
		const view = new LibraryView(world.container);

		const loading = view.load();
		world.lists[0].settle(ok([book('one'), book('two')]));
		await loading;

		const removing = view.remove(bookId('one'));
		world.removes[0].settle(err({ kind: 'storage-failed', cause: 'the disk went away' }));
		await expect(removing).resolves.toBeUndefined();

		expect(view.removing).toBeNull();
		expect(view.message).toBe('Local storage failed: the disk went away');
		expect(view.books.map((b) => b.id)).toEqual(['one', 'two']);
		expect(world.lists).toHaveLength(1);
	});

	it('ignores a remove while another remove is running', async () => {
		const world = fakes();
		const view = new LibraryView(world.container);

		const loading = view.load();
		world.lists[0].settle(ok([book('one'), book('two')]));
		await loading;

		const first = view.remove(bookId('one'));
		await view.remove(bookId('two'));

		expect(world.removes).toHaveLength(1);
		expect(view.removing).toBe('one');

		world.removes[0].settle(ok(undefined));
		await settleMicrotasks();
		world.lists[1].settle(ok([book('two')]));
		await first;

		expect(view.books.map((b) => b.id)).toEqual(['two']);
	});

	it('ignores a remove while an upload is running', async () => {
		const world = fakes();
		const view = new LibraryView(world.container);

		const loading = view.load();
		world.lists[0].settle(ok([book('one')]));
		await loading;

		const uploading = view.upload([chosen('page.png')]);
		await view.remove(bookId('one'));

		expect(world.removes).toHaveLength(0);
		expect(view.removing).toBeNull();

		world.opens[0].settle(err({ kind: 'source', error: { kind: 'empty' } }));
		await uploading;

		expect(view.books.map((b) => b.id)).toEqual(['one']);
	});
});
