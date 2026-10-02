import { describe, expect, it } from 'vitest';
import type { OriginStores, OriginSurvey } from '../domain/origin-stores';
import { measuredBytes } from '../domain/storage-parts';
import type { StorageAccount } from '../domain/storage-parts';
import { readStorageAccount } from './read-storage-account';

const MODEL = 'DigitalLarynx/manga-ocr-onnx';

const HOST = `https://huggingface.co/${MODEL}/resolve/main`;

const RUNTIME_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers/dist/ort-wasm.wasm';

const USAGE = 395_000_000;

function stores(survey: OriginSurvey): OriginStores {
  return { survey: () => Promise.resolve(survey) };
}

async function accountOf(survey: OriginSurvey): Promise<StorageAccount> {
  const read = await readStorageAccount({
    stores: stores(survey),
    estimate: () => Promise.resolve({ usage: USAGE, quota: 11_000_000_000 }),
    persisted: () => Promise.resolve(true),
  });

  return read.account;
}

function fullSurvey(): OriginSurvey {
  return {
    cached: [
      { url: `${HOST}/onnx/encoder_model_quantized.onnx`, bytes: 87_000_000 },
      { url: `${HOST}/onnx/decoder_model_merged.onnx`, bytes: 117_000_000 },
      { url: `${HOST}/config.json`, bytes: 1_000_000 },
      { url: RUNTIME_URL, bytes: 27_000_000 },
    ],
    files: [
      { place: 'blobs', bytes: 100_000_000 },
      { place: 'blobs', bytes: 60_000_000 },
      { place: 'partials', bytes: 3_000_000 },
    ],
  };
}

function partNamed(account: StorageAccount, key: string): number | null | undefined {
  return account.parts.find((part) => part.key === key)?.bytes;
}

describe('readStorageAccount', () => {
  it('counts the ONNX runtime apart from the model it serves', async () => {
    const account = await accountOf(fullSurvey());

    expect(partNamed(account, MODEL)).toBe(205_000_000);
    expect(partNamed(account, 'runtime')).toBe(27_000_000);
  });

  it('counts the books and the part-downloads as parts of their own', async () => {
    const account = await accountOf(fullSurvey());

    expect(partNamed(account, 'books')).toBe(160_000_000);
    expect(partNamed(account, 'partials')).toBe(3_000_000);
  });

  it.each([
    { survey: fullSurvey(), remainder: 0 },
    { survey: { cached: [], files: [] }, remainder: USAGE },
  ])(
    'accounts for every byte the origin reports, leaving $remainder unexplained',
    async ({ survey, remainder }) => {
      const account = await accountOf(survey);

      expect(measuredBytes(account.parts) + (account.remainder ?? 0)).toBe(USAGE);
      expect(account.remainder).toBe(remainder);
    },
  );

  it.each([
    { survey: fullSurvey(), measured: USAGE, unmeasured: ['records'] },
    {
      survey: { cached: null, files: null },
      measured: 0,
      unmeasured: ['cached', 'files', 'records'],
    },
  ])(
    'reports the browser database and a store this browser does not expose as unmeasurable',
    async ({ survey, measured, unmeasured }) => {
      const account = await accountOf(survey);

      expect(partNamed(account, 'records')).toBeNull();
      expect(account.measured).toBe(measured);
      expect(account.unmeasured.map((part) => part.key)).toEqual(unmeasured);
    },
  );

  it('names a cached file that belongs to no model and is no runtime', async () => {
    const account = await accountOf({
      cached: [{ url: 'https://example.test/whatever.json', bytes: 5_000 }],
      files: [],
    });

    expect(partNamed(account, 'other-cached')).toBe(5_000);
  });

  it('says what a part holds beside how many files it is', async () => {
    const account = await accountOf(fullSurvey());
    const records = account.parts.find((part) => part.key === 'records');

    expect(account.parts.find((part) => part.key === 'runtime')?.detail).toContain(
      'the WebAssembly the model runs in',
    );
    expect(records?.detail).toContain('text only');
    expect(records?.detail).toContain('small');
  });

  it('counts a cached file of unreported size without adding bytes for it', async () => {
    const account = await accountOf({
      cached: [{ url: `${HOST}/config.json`, bytes: null }],
      files: [],
    });

    expect(partNamed(account, MODEL)).toBe(0);
    expect(account.parts.find((part) => part.key === MODEL)?.detail).toContain(
      '1 file, 1 of unreported size',
    );
  });
});
