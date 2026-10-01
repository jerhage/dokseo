import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  directoryNamed,
  isPrivateWindowRefusal,
  NO_FILE_SYSTEM,
  PRIVATE_WINDOW,
  storageRoot,
} from './directory';

function refusing(name: string): () => Promise<never> {
  return () => {
    const refused = new Error('Security error when calling GetDirectory');
    refused.name = name;
    return Promise.reject(refused);
  };
}

function storageThat(getDirectory: () => Promise<unknown>): void {
  vi.stubGlobal('navigator', { storage: { getDirectory } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('storageRoot', () => {
  it('says a private window will not save files, in words a reader can act on', async () => {
    storageThat(refusing('SecurityError'));

    await expect(storageRoot()).rejects.toThrow(PRIVATE_WINDOW);
  });

  it('keeps the original wording for a refusal that is not a private window', async () => {
    storageThat(refusing('InvalidStateError'));

    await expect(storageRoot()).rejects.toThrow('Security error when calling GetDirectory');
  });

  it('answers the root when the file system allows it', async () => {
    const root = { name: 'root' };
    storageThat(() => Promise.resolve(root));

    await expect(storageRoot()).resolves.toBe(root);
  });
});

describe('directoryNamed', () => {
  it('refuses a browser with no file system at all', async () => {
    vi.stubGlobal('navigator', {});

    await expect(directoryNamed('books')).rejects.toThrow(NO_FILE_SYSTEM);
  });

  it('carries the private window message out of the root it could not open', async () => {
    storageThat(refusing('SecurityError'));

    await expect(directoryNamed('books')).rejects.toThrow(PRIVATE_WINDOW);
  });
});

describe('isPrivateWindowRefusal', () => {
  it('recognises the refusal the root raises in a private window', async () => {
    storageThat(refusing('SecurityError'));

    const refusal = await storageRoot().catch((cause: unknown) => cause);

    expect(isPrivateWindowRefusal(refusal)).toBe(true);
  });

  it('passes over any other refusal', async () => {
    storageThat(refusing('InvalidStateError'));

    const refusal = await storageRoot().catch((cause: unknown) => cause);

    expect(isPrivateWindowRefusal(refusal)).toBe(false);
    expect(isPrivateWindowRefusal(PRIVATE_WINDOW)).toBe(false);
  });
});
