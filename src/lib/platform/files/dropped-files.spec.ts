import { describe, expect, it } from 'vitest';
import { at } from '$lib/shared/testing/at';
import { filesFromDataTransfer } from './dropped-files';

type Node = { readonly name: string; readonly children?: readonly Node[] };

function entryOf(node: Node): FileSystemEntry {
  if (node.children === undefined) {
    const file = new File(['bytes'], node.name);
    Object.defineProperty(file, 'webkitRelativePath', { value: '', configurable: true });
    return {
      isFile: true,
      isDirectory: false,
      name: node.name,
      file: (accept: (f: File) => void) => accept(file),
    } as unknown as FileSystemEntry;
  }

  const children = node.children.map(entryOf);
  return {
    isFile: false,
    isDirectory: true,
    name: node.name,
    createReader: () => {
      let served = false;
      return {
        readEntries: (accept: (entries: readonly FileSystemEntry[]) => void) => {
          accept(served ? [] : children);
          served = true;
        },
      };
    },
  } as unknown as FileSystemEntry;
}

function transferOf(nodes: readonly Node[], fallback: readonly File[] = []): DataTransfer {
  const items = nodes.map((node) => ({ kind: 'file', webkitGetAsEntry: () => entryOf(node) }));
  return { items, files: fallback } as unknown as DataTransfer;
}

describe('filesFromDataTransfer', () => {
  it('takes loose files with no relative path', async () => {
    const files = await filesFromDataTransfer(transferOf([{ name: 'page01.png' }]));

    expect(files.map((f) => f.name)).toEqual(['page01.png']);
    expect(at(files, 0).webkitRelativePath).toBe('');
  });

  it('walks a dropped folder and records the path below it', async () => {
    const transfer = transferOf([
      {
        name: 'Ch 12',
        children: [{ name: 'a.png' }, { name: 'inner', children: [{ name: 'b.png' }] }],
      },
    ]);

    const files = await filesFromDataTransfer(transfer);

    expect(files.map((f) => f.webkitRelativePath)).toEqual(['Ch 12/a.png', 'Ch 12/inner/b.png']);
  });

  it('falls back to the plain file list when no entry is available', async () => {
    const fallback = [new File(['bytes'], 'chapter.cbz')];
    const transfer = { items: [], files: fallback } as unknown as DataTransfer;

    const files = await filesFromDataTransfer(transfer);

    expect(files.map((f) => f.name)).toEqual(['chapter.cbz']);
  });
});
