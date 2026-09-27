import { describe, expect, it } from 'vitest';
import { selectFiles } from '$lib/components/file-selection';
import type { FileLike } from '$lib/components/file-selection';
import { arrivedFiles } from './chosen-files';

function file(name: string, type = ''): FileLike {
  return { name, type, size: 1 };
}

describe('arrivedFiles', () => {
  const policy = {
    rules: [
      { kind: 'family', prefix: 'image/' },
      { kind: 'extension', extension: '.cbz' },
    ],
    maxSize: undefined,
    multiple: true,
  } as const;

  it('passes on every accepted file', () => {
    const selection = selectFiles([file('1.jpg', 'image/jpeg'), file('b.cbz')], policy);

    expect(arrivedFiles(selection).map((arrived) => arrived.name)).toEqual(['1.jpg', 'b.cbz']);
  });

  it('passes on the files the accept list refuses, so the upload reports them itself', () => {
    const selection = selectFiles(
      [file('1.jpg', 'image/jpeg'), file('notes.txt', 'text/plain')],
      policy,
    );

    expect(arrivedFiles(selection).map((arrived) => arrived.name)).toEqual(['1.jpg', 'notes.txt']);
  });

  it('keeps the order the files arrived in when a refused file comes first', () => {
    const selection = selectFiles(
      [file('notes.txt', 'text/plain'), file('1.jpg', 'image/jpeg'), file('b.cbz')],
      policy,
    );

    expect(arrivedFiles(selection).map((arrived) => arrived.name)).toEqual([
      'notes.txt',
      '1.jpg',
      'b.cbz',
    ]);
  });
});
