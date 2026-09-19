import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Container } from '$lib/container';
import { bookId, imageIndex } from '$lib/shared/ids';
import { err, ok, type Result } from '$lib/shared/result';
import type { Book } from '../domain/book';
import type { LibraryError, LibraryRepository } from '../domain/library-repository';
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
	readonly cover: CoverState;
};

function fakes(): Fakes {
	const lists: Deferred<Result<readonly Book[], LibraryError>>[] = [];
	const opens: Deferred<Result<Book, OpenFileError>>[] = [];
	const cover: CoverState = { outcome: ok(new Blob(['cover'])), gate: () => Promise.resolve() };

	const repository: LibraryRepository = {
		list: () => {
			const next = deferred<Result<readonly Book[], LibraryError>>();
			lists.push(next);
			return next.promise;
		},
		get: (id) => Promise.resolve(err({ kind: 'not-found', id })),
		add: () => Promise.resolve(ok(undefined)),
		remove: () => Promise.resolve(ok(undefined)),
		savePosition: () => Promise.resolve(ok(undefined)),
		readSource: () => Promise.resolve(ok(new Blob(['source']))),
		readCover: () => cover.gate().then(() => cover.outcome)
	};

	const container: Container = {
		library: {
			repository,
			openFile: () => {
				const next = deferred<Result<Book, OpenFileError>>();
				opens.push(next);
				return next.promise;
			}
		}
	};

	return { container, lists, opens, cover };
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

		const uploading = view.upload([new File(['x'], 'page.png')]);
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

		const uploading = view.upload([new File(['x'], 'page.png')]);
		world.opens[0].settle(ok(book('two')));
		await Promise.resolve();
		await Promise.resolve();
		world.lists[1].settle(ok([book('one'), book('two')]));
		await uploading;

		expect(view.books.map((b) => b.id)).toEqual(['one', 'two']);
		expect(view.message).toBeNull();
	});

	it('ignores an upload with no files', async () => {
		const world = fakes();
		const view = new LibraryView(world.container);

		await view.upload([]);

		expect(world.opens).toHaveLength(0);
		expect(view.busy).toBe(false);
	});
});
