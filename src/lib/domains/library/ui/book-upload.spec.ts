import { describe, expect, it } from 'vitest';
import type { Container } from '$lib/container';
import type { Notice } from '$lib/shared/notice';
import { BookUpload } from './book-upload.svelte';
import { LibraryBooks } from './library-books.svelte';

describe('BookUpload', () => {
  it('raises no notice and opens no file for an empty selection', async () => {
    const opened: unknown[] = [];
    const notices: Notice[] = [];
    const container = {
      library: {
        openFile: (files: readonly File[]) => {
          opened.push(files);
          return Promise.reject(new Error('not reached'));
        },
      },
    } as unknown as Container;
    const upload = new BookUpload(
      container,
      (notice) => {
        notices.push(notice);
      },
      new LibraryBooks(container),
    );

    await upload.add([], () => undefined);

    expect(notices).toEqual([]);
    expect(opened).toEqual([]);
    expect(upload.busy).toBe(false);
  });
});
