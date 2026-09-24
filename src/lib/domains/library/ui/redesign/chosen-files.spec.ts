import { describe, expect, it } from 'vitest';
import { selectFiles } from '$lib/components/file-selection';
import type { FileLike } from '$lib/components/file-selection';
import { arrivedFiles, takeChosen } from './chosen-files';

function file(name: string, type = ''): FileLike {
  return { name, type, size: 1 };
}

describe('takeChosen', () => {
  it('returns the chosen files in the order they were chosen', () => {
    const input = { files: [file('b.jpg'), file('a.jpg')], value: 'C:\\fakepath\\b.jpg' };

    expect(takeChosen(input).map((chosen) => chosen.name)).toEqual(['b.jpg', 'a.jpg']);
  });

  it('clears the input so the same file can be chosen twice', () => {
    const input = { files: [file('chapter.cbz')], value: 'C:\\fakepath\\chapter.cbz' };

    takeChosen(input);

    expect(input.value).toBe('');
  });

  it('returns nothing when the input holds no file list', () => {
    const input = { files: null, value: '' };

    expect(takeChosen(input)).toEqual([]);
  });
});

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
      [file('notes.txt', 'text/plain'), file('1.jpg', 'image/jpeg')],
      policy,
    );

    expect(arrivedFiles(selection).map((arrived) => arrived.name)).toEqual(['1.jpg', 'notes.txt']);
  });
});
