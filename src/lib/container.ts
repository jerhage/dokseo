import { requestPersistence } from '$lib/platform/storage/persistence';
import type { Result } from '$lib/shared/result';
import { createFileSourceBuilder } from './domains/library/adapters/file-source-builder';
import { createLibraryRepository } from './domains/library/adapters/indexeddb-opfs-library.repo';
import type { Book } from './domains/library/domain/book';
import type { LibraryRepository } from './domains/library/domain/library-repository';
import { openFile, type OpenFileDeps, type OpenFileError } from './domains/library/use-cases/open-file';

export type Container = {
	readonly library: {
		readonly repository: LibraryRepository;
		readonly openFile: (files: readonly File[]) => Promise<Result<Book, OpenFileError>>;
	};
};

export function buildContainer(): Container {
	const repository = createLibraryRepository();

	const openFileDeps: OpenFileDeps = {
		repository,
		builder: createFileSourceBuilder(),
		requestPersistence,
		now: Date.now,
		newId: () => crypto.randomUUID()
	};

	return {
		library: {
			repository,
			openFile: (files: readonly File[]) => openFile(openFileDeps, files)
		}
	};
}
