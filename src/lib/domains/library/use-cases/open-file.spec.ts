import { describe, expect, it } from 'vitest';
import type { BookId, ImageIndex } from '$lib/shared/ids';
import { err, ok, type Result } from '$lib/shared/result';
import type { Book } from '../domain/book';
import type { LibraryError, LibraryRepository } from '../domain/library-repository';
import type { BuiltSource, SourceBuildError, SourceBuilder } from '../domain/source-builder';
import { openFile, type OpenFileDeps } from './open-file';

const NOW = 1758240000000;

const NEW_ID = 'book-7';

function notFound(id: BookId): Result<never, LibraryError> {
	return err({ kind: 'not-found', id });
}

function builtSource(overrides: Partial<BuiltSource> = {}): BuiltSource {
	return {
		blob: new Blob(['source bytes']),
		sourceKind: 'archive',
		imageCount: 182,
		cover: new Blob(['cover bytes']),
		suggestedTitle: 'Yotsuba&! 1',
		...overrides
	};
}

type AddCall = { readonly book: Book; readonly source: Blob; readonly cover: Blob };

function fakeRepository(outcome: Result<void, LibraryError> = ok(undefined)) {
	const added: AddCall[] = [];
	const repository: LibraryRepository = {
		list: () => Promise.resolve(ok([])),
		get: (id) => Promise.resolve(notFound(id)),
		add: (book, source, cover) => {
			added.push({ book, source, cover });
			return Promise.resolve(outcome);
		},
		remove: () => Promise.resolve(ok(undefined)),
		savePosition: () => Promise.resolve(ok(undefined)),
		readSource: (id) => Promise.resolve(notFound(id)),
		readCover: (id) => Promise.resolve(notFound(id))
	};
	return { repository, added };
}

function fakeBuilder(outcome: Result<BuiltSource, SourceBuildError>) {
	const calls: (readonly File[])[] = [];
	const builder: SourceBuilder = {
		build: (files) => {
			calls.push(files);
			return Promise.resolve(outcome);
		}
	};
	return { builder, calls };
}

function deps(over: Partial<OpenFileDeps> = {}): OpenFileDeps {
	return {
		repository: fakeRepository().repository,
		builder: fakeBuilder(ok(builtSource())).builder,
		requestPersistence: () => Promise.resolve(true),
		now: () => NOW,
		newId: () => NEW_ID,
		...over
	};
}

const files: readonly File[] = [new File(['bytes'], 'Yotsuba&! 1.cbz')];

describe('openFile', () => {
	it('returns the stored book on the happy path', async () => {
		const repository = fakeRepository();
		const result = await openFile(deps({ repository: repository.repository }), files);
		expect(result.ok).toBe(true);
		expect(result.ok && result.value.title).toBe('Yotsuba&! 1');
	});

	it('stores exactly the book it returns', async () => {
		const repository = fakeRepository();
		const result = await openFile(deps({ repository: repository.repository }), files);
		expect(repository.added).toHaveLength(1);
		expect(result.ok && result.value).toEqual(repository.added[0].book);
	});

	it('stores the source blob and the cover the builder produced', async () => {
		const built = builtSource();
		const repository = fakeRepository();
		const builder = fakeBuilder(ok(built));
		await openFile(deps({ repository: repository.repository, builder: builder.builder }), files);
		expect(repository.added[0].source).toBe(built.blob);
		expect(repository.added[0].cover).toBe(built.cover);
	});

	it('uses the injected id, time and title', async () => {
		const builder = fakeBuilder(ok(builtSource({ suggestedTitle: 'Nichijou 3' })));
		const result = await openFile(
			deps({ builder: builder.builder, now: () => 42, newId: () => 'b-99' }),
			files
		);
		expect(result.ok && result.value.id).toBe('b-99');
		expect(result.ok && result.value.addedAt).toBe(42);
		expect(result.ok && result.value.title).toBe('Nichijou 3');
	});

	it('defaults a new book to Japanese, paged, right to left, at the first image', async () => {
		const result = await openFile(deps(), files);
		expect(result.ok && result.value.language).toBe('ja');
		expect(result.ok && result.value.layoutKind).toBe('paged');
		expect(result.ok && result.value.direction).toBe('rtl');
		expect(result.ok && result.value.position).toBe(0);
	});

	it('carries the source kind and the image count the builder reported', async () => {
		const builder = fakeBuilder(ok(builtSource({ sourceKind: 'pdf', imageCount: 7 })));
		const result = await openFile(deps({ builder: builder.builder }), files);
		expect(result.ok && result.value.sourceKind).toBe('pdf');
		expect(result.ok && result.value.imageCount).toBe(7);
	});

	it('hands the builder the files it was given', async () => {
		const builder = fakeBuilder(ok(builtSource()));
		await openFile(deps({ builder: builder.builder }), files);
		expect(builder.calls).toEqual([files]);
	});

	it('requests the persistence grant', async () => {
		let requested = 0;
		await openFile(
			deps({
				requestPersistence: () => {
					requested += 1;
					return Promise.resolve(true);
				}
			}),
			files
		);
		expect(requested).toBe(1);
	});

	it('requests the persistence grant before it builds the source', async () => {
		const order: string[] = [];
		const builder: SourceBuilder = {
			build: () => {
				order.push('build');
				return Promise.resolve(ok(builtSource()));
			}
		};
		await openFile(
			deps({
				builder,
				requestPersistence: () => {
					order.push('persist');
					return Promise.resolve(true);
				}
			}),
			files
		);
		expect(order).toEqual(['persist', 'build']);
	});

	it('completes the upload when the persistence grant is refused', async () => {
		const repository = fakeRepository();
		const result = await openFile(
			deps({ repository: repository.repository, requestPersistence: () => Promise.resolve(false) }),
			files
		);
		expect(result.ok).toBe(true);
		expect(repository.added).toHaveLength(1);
	});

	it('reports a builder failure as a source error', async () => {
		const builder = fakeBuilder(err<SourceBuildError>({ kind: 'nothing-usable' }));
		const result = await openFile(deps({ builder: builder.builder }), files);
		expect(result).toEqual({
			ok: false,
			error: { kind: 'source', error: { kind: 'nothing-usable' } }
		});
	});

	it('never stores anything when the builder fails', async () => {
		const repository = fakeRepository();
		const builder = fakeBuilder(err<SourceBuildError>({ kind: 'empty' }));
		await openFile(deps({ repository: repository.repository, builder: builder.builder }), files);
		expect(repository.added).toEqual([]);
	});

	it('reports a repository failure as a storage error', async () => {
		const repository = fakeRepository(
			err<LibraryError>({ kind: 'storage-failed', cause: 'the quota is exhausted' })
		);
		const result = await openFile(deps({ repository: repository.repository }), files);
		expect(result).toEqual({
			ok: false,
			error: { kind: 'storage', error: { kind: 'storage-failed', cause: 'the quota is exhausted' } }
		});
	});

	it('leaves the reading position typed as an image index', async () => {
		const result = await openFile(deps(), files);
		const position: ImageIndex | undefined = result.ok ? result.value.position : undefined;
		expect(position).toBe(0);
	});
});
