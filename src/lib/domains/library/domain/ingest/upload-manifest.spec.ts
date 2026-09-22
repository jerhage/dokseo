import { describe, expect, it } from 'vitest';
import { at } from '$lib/shared/testing/at';
import { uploadManifest } from './upload-manifest';
import type { ManifestEntry } from './upload-manifest';

const folder: readonly ManifestEntry[] = [
  { name: 'Ch 12/001.png', size: 204_800 },
  { name: 'Ch 12/002.png', size: 198_144 },
  { name: 'Ch 12/003.png', size: 211_003 },
];

function withFirst(first: ManifestEntry): readonly ManifestEntry[] {
  return [first, at(folder, 1), at(folder, 2)];
}

describe('uploadManifest', () => {
  it('reads the same manifest whichever order the files arrive in', () => {
    const shuffled = [at(folder, 2), at(folder, 0), at(folder, 1)];

    expect(uploadManifest(shuffled)).toBe(uploadManifest(folder));
  });

  it('reads the same manifest from a reversed upload', () => {
    expect(uploadManifest(folder.toReversed())).toBe(uploadManifest(folder));
  });

  it('changes when a file is renamed', () => {
    const renamed = withFirst({ name: 'Ch 12/01.png', size: 204_800 });

    expect(uploadManifest(renamed)).not.toBe(uploadManifest(folder));
  });

  it('changes when a file is resized', () => {
    const resized = withFirst({ name: 'Ch 12/001.png', size: 204_801 });

    expect(uploadManifest(resized)).not.toBe(uploadManifest(folder));
  });

  it('changes when a file is added', () => {
    const added = [...folder, { name: 'Ch 12/004.png', size: 190_000 }];

    expect(uploadManifest(added)).not.toBe(uploadManifest(folder));
  });

  it('changes when a file is removed', () => {
    expect(uploadManifest(folder.slice(0, 2))).not.toBe(uploadManifest(folder));
  });

  it('separates two uploads that differ only by where a name ends', () => {
    const one = uploadManifest([
      { name: 'a', size: 1 },
      { name: 'b', size: 2 },
    ]);
    const other = uploadManifest([{ name: 'a", 1]\n["b', size: 2 }]);

    expect(one).not.toBe(other);
  });

  it('reads an empty upload as an empty manifest', () => {
    expect(uploadManifest([])).toBe('');
  });
});
