import { describe, expect, it } from 'vitest';
import { fitsOneAsset, totalBytes } from '../../../domain/asset-limit';
import { IPADIC_ARCHIVE, KO_DIC_ARCHIVE } from './plan-facts';

describe('the recorded Lindera archives', () => {
  it.each([IPADIC_ARCHIVE, KO_DIC_ARCHIVE])(
    'lists files that add up to $name unpacked',
    (archive) => {
      expect(totalBytes(archive.files)).toBe(archive.unpackedBytes);
    },
  );

  it.each([IPADIC_ARCHIVE, KO_DIC_ARCHIVE])(
    'keeps $name itself under the asset limit',
    (archive) => {
      expect(fitsOneAsset({ name: archive.name, bytes: archive.zipBytes })).toBe(true);
    },
  );

  it.each([IPADIC_ARCHIVE, KO_DIC_ARCHIVE])(
    'finds dict.words over the asset limit once $name is unpacked',
    (archive) => {
      const over = archive.files.filter((file) => !fitsOneAsset(file)).map((file) => file.name);

      expect(over).toEqual(['dict.words']);
    },
  );
});
