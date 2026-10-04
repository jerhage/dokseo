import { describe, expect, it } from 'vitest';
import type { LibraryRepository } from '$lib/domains/library/domain/book/library-repository';
import type { CaptureRepository } from '$lib/domains/recognition/domain/capture/capture-repository';
import type { TagRepository } from '$lib/domains/recognition/domain/tag/tag-repository';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { CAPTURES_FILE_FORMAT, CAPTURES_FILE_VERSION } from './captures-file';
import { previewCapturesImport } from './preview-captures-import';
import type { PreviewCapturesImportDeps } from './preview-captures-import';

type Refusal = 'none' | 'shelf' | 'restorable' | 'tags' | 'captures';

const EMPTY_FILE = JSON.stringify({
  format: CAPTURES_FILE_FORMAT,
  version: CAPTURES_FILE_VERSION,
  exportedAt: 1,
  appVersion: '0.9.3',
  books: [],
  tags: [],
  captures: [],
});

function notUsed(): Promise<never> {
  return Promise.reject(new Error('not used'));
}

function deps(refusal: Refusal = 'none'): PreviewCapturesImportDeps {
  const repository: LibraryRepository = {
    list: () =>
      Promise.resolve(
        refusal === 'shelf' ? STORAGE_UNAVAILABLE : { kind: 'success', books: [], unreadable: [] },
      ),
    get: notUsed,
    add: notUsed,
    readPageList: notUsed,
    savePageList: notUsed,
    remove: notUsed,
    listRemoved: notUsed,
    listRestorable: () =>
      Promise.resolve(
        refusal === 'restorable'
          ? STORAGE_UNAVAILABLE
          : { kind: 'success', removed: [], unreadable: [] },
      ),
    addRemoved: notUsed,
    forgetRemoved: notUsed,
    update: notUsed,
    readSource: notUsed,
    readCover: notUsed,
    storedBytes: notUsed,
  };
  const tags: TagRepository = {
    list: () =>
      Promise.resolve(
        refusal === 'tags' ? STORAGE_UNAVAILABLE : { kind: 'success', tags: [], unreadable: [] },
      ),
    save: notUsed,
    remove: notUsed,
  };
  const captures: CaptureRepository = {
    listForBook: notUsed,
    listEverything: () =>
      Promise.resolve(
        refusal === 'captures'
          ? STORAGE_UNAVAILABLE
          : { kind: 'success', captures: [], unreadable: [] },
      ),
    save: notUsed,
    remove: notUsed,
    clearBook: notUsed,
    moveBook: notUsed,
    untagEverywhere: notUsed,
  };
  return {
    shelf: { repository },
    restorable: { repository },
    tags: { tags },
    captures: { captures },
    newId: () => 'minted',
    now: () => 1,
  };
}

describe('previewCapturesImport', () => {
  it('passes on a text that is not a captures file', async () => {
    expect(await previewCapturesImport(deps(), '{"hello":1}')).toEqual({ kind: 'not-an-export' });
  });

  it('passes on a file from a newer version of the app', async () => {
    const newer = JSON.stringify({ format: CAPTURES_FILE_FORMAT, version: 2 });

    expect(await previewCapturesImport(deps(), newer)).toEqual({
      kind: 'newer-version',
      version: 2,
    });
  });

  it.each(['shelf', 'restorable', 'tags', 'captures'] as const)(
    'reports storage-unavailable when the %s cannot be read',
    async (refusal) => {
      expect(await previewCapturesImport(deps(refusal), EMPTY_FILE)).toEqual(STORAGE_UNAVAILABLE);
    },
  );

  it('plans a readable file against what this device holds', async () => {
    const preview = await previewCapturesImport(deps(), EMPTY_FILE);

    expect(preview).toMatchObject({
      kind: 'success',
      plan: { books: [], records: [], tags: [], captures: [], summary: { added: 0 } },
    });
  });
});
