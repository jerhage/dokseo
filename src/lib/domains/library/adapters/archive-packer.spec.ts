import { BlobReader, ZipReader } from '@zip.js/zip.js';
import { describe, expect, it } from 'vitest';
import { packImagesIntoArchive } from './archive-packer';

function chosen(path: string): File {
  const name = path.slice(path.lastIndexOf('/') + 1);
  const file = new File([path], name);
  Object.defineProperty(file, 'webkitRelativePath', { value: path });
  return file;
}

async function entryNames(archive: Blob): Promise<readonly string[]> {
  const reader = new ZipReader(new BlobReader(archive));
  const entries = await reader.getEntries();
  await reader.close();
  return entries.map((entry) => entry.filename);
}

describe('packImagesIntoArchive', () => {
  it('packs the page images of a folder and leaves every junk file out', async () => {
    const packed = await packImagesIntoArchive([
      chosen('Blame/001.jpg'),
      chosen('Blame/._001.jpg'),
      chosen('Blame/__MACOSX/Blame/._002.jpg'),
      chosen('Blame/.DS_Store'),
      chosen('Blame/.cover.png'),
      chosen('Blame/Thumbs.db'),
      chosen('Blame/002.jpg'),
    ]);
    if (packed.kind !== 'success') throw new Error('the images could not be packed');

    expect(await entryNames(packed.archive)).toEqual(['Blame/001.jpg', 'Blame/002.jpg']);
  });

  it('reports no images when every image is junk', async () => {
    const packed = await packImagesIntoArchive([chosen('Blame/._001.jpg'), chosen('.p.png')]);

    expect(packed).toEqual({ kind: 'source-unreadable', cause: 'No image files were found' });
  });
});
