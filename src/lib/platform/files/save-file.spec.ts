import { describe, expect, it } from 'vitest';
import { saveFile } from './save-file';
import type { FileSaving, FileToSave } from './save-file';

const EXPORT: FileToSave = {
  text: '{"format":"dokseo-captures"}',
  name: 'dokseo-captures-2026-10-03.json',
  type: 'application/json',
};

type Seen = {
  readonly shared: File[];
  readonly downloaded: File[];
};

function saving(
  share: ((data: ShareData) => Promise<void>) | null,
  canShare = true,
  touchDevice = true,
): { saving: FileSaving; seen: Seen } {
  const seen: Seen = { shared: [], downloaded: [] };
  return {
    seen,
    saving: {
      touchDevice,
      sharing:
        share === null
          ? null
          : {
              canShare: () => canShare,
              share: (data) => {
                seen.shared.push(...(data.files ?? []));
                return share(data);
              },
            },
      download: (file) => {
        seen.downloaded.push(file);
      },
    },
  };
}

function refusing(name: string): () => Promise<void> {
  return () => Promise.reject(new DOMException('refused', name));
}

describe('saveFile', () => {
  it('shares the file when the browser can share it', async () => {
    const { saving: through, seen } = saving(() => Promise.resolve());

    expect(await saveFile(through, EXPORT)).toEqual({ kind: 'shared' });
    expect(seen.downloaded).toEqual([]);
    expect(seen.shared.map((file) => [file.name, file.type])).toEqual([
      ['dokseo-captures-2026-10-03.json', 'application/json'],
    ]);
    expect(await seen.shared[0]?.text()).toBe(EXPORT.text);
  });

  it('downloads the file when the browser cannot share files of this kind', async () => {
    const { saving: through, seen } = saving(() => Promise.resolve(), false);

    expect(await saveFile(through, EXPORT)).toEqual({ kind: 'downloaded' });
    expect(seen.shared).toEqual([]);
    expect(seen.downloaded.map((file) => file.name)).toEqual([EXPORT.name]);
  });

  it('downloads the file on a desktop even when the browser can share it', async () => {
    const { saving: through, seen } = saving(() => Promise.resolve(), true, false);

    expect(await saveFile(through, EXPORT)).toEqual({ kind: 'downloaded' });
    expect(seen.shared).toEqual([]);
    expect(seen.downloaded.map((file) => file.name)).toEqual([EXPORT.name]);
  });

  it('shares the file on a touch device that can share it', async () => {
    const { saving: through, seen } = saving(() => Promise.resolve(), true, true);

    expect(await saveFile(through, EXPORT)).toEqual({ kind: 'shared' });
    expect(seen.downloaded).toEqual([]);
    expect(seen.shared).toHaveLength(1);
  });

  it('downloads the file on a touch device that cannot share it', async () => {
    const { saving: through, seen } = saving(() => Promise.resolve(), false, true);

    expect(await saveFile(through, EXPORT)).toEqual({ kind: 'downloaded' });
    expect(seen.shared).toEqual([]);
    expect(seen.downloaded).toHaveLength(1);
  });

  it('downloads the file when the browser has no share sheet', async () => {
    const { saving: through, seen } = saving(null);

    expect(await saveFile(through, EXPORT)).toEqual({ kind: 'downloaded' });
    expect(seen.downloaded).toHaveLength(1);
  });

  it('reports a dismissed share sheet as cancelled', async () => {
    const { saving: through } = saving(refusing('AbortError'));

    expect(await saveFile(through, EXPORT)).toEqual({ kind: 'cancelled' });
  });

  it('asks for another tap when the share sheet needs a fresh activation', async () => {
    const { saving: through, seen } = saving(refusing('NotAllowedError'));

    expect(await saveFile(through, EXPORT)).toEqual({
      kind: 'needs-another-tap',
    });
    expect(seen.downloaded).toEqual([]);
  });

  it('calls share before its first await, so a tap still counts as the activation', () => {
    const { saving: through, seen } = saving(() => new Promise<void>(() => undefined));

    void saveFile(through, EXPORT);

    expect(seen.shared).toHaveLength(1);
  });

  it('rethrows any other refusal from the share sheet', async () => {
    const failure = new DOMException('broken', 'DataError');
    const { saving: through } = saving(() => Promise.reject(failure));

    await expect(saveFile(through, EXPORT)).rejects.toBe(failure);
  });

  it('rethrows a failure that is not a DOM exception', async () => {
    const failure = new TypeError('no files');
    const { saving: through } = saving(() => Promise.reject(failure));

    await expect(saveFile(through, EXPORT)).rejects.toBe(failure);
  });
});
