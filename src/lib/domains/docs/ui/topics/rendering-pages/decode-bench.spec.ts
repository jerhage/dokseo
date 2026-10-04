import { describe, expect, it } from 'vitest';
import { DecodeBench } from './decode-bench.svelte';
import type { DecodeBenchDeps } from './decode-bench.svelte';

type FakeBitmap = { width: number; height: number; closes: number; close(): void };

function fakeBitmap(width: number, height: number): FakeBitmap {
  return {
    width,
    height,
    closes: 0,
    close() {
      this.closes += 1;
      this.width = 0;
      this.height = 0;
    },
  };
}

function benchWith(bitmaps: FakeBitmap[], overrides: Partial<DecodeBenchDeps> = {}) {
  let clock = 0;
  const deps: DecodeBenchDeps = {
    blobFor: () => Promise.resolve(new Blob([new Uint8Array(500)])),
    decode: () => {
      clock += 40;
      const next = bitmaps.shift();
      if (next === undefined) return Promise.reject(new Error('no bitmap left'));
      return Promise.resolve(next as unknown as ImageBitmap);
    },
    now: () => clock,
    ...overrides,
  };
  return new DecodeBench(deps);
}

describe('DecodeBench', () => {
  it('records the encoded size, the decoded size and the time the decode took', async () => {
    const bench = benchWith([fakeBitmap(2000, 3000)]);

    await bench.decode('scan');

    expect(bench.decoded).toHaveLength(1);
    expect(bench.decoded[0]).toMatchObject({
      sample: 'scan',
      encodedBytes: 500,
      size: { width: 2000, height: 3000 },
      decodeMs: 40,
      closedSize: null,
    });
    expect(bench.heldBytes).toBe(24_000_000);
    expect(bench.status.kind).toBe('idle');
  });

  it('adds the memory of every bitmap still open', async () => {
    const bench = benchWith([fakeBitmap(100, 100), fakeBitmap(200, 100)]);

    await bench.decode('page');
    await bench.decode('page');

    expect(bench.heldBytes).toBe(120_000);
  });

  it('closes one bitmap, reports its size after close and stops counting it', async () => {
    const first = fakeBitmap(100, 100);
    const bench = benchWith([first, fakeBitmap(200, 100)]);
    await bench.decode('page');
    await bench.decode('page');
    const id = bench.decoded[1]?.id ?? -1;

    bench.close(id);
    bench.close(id);

    expect(first.closes).toBe(1);
    expect(bench.decoded[1]?.closedSize).toEqual({ width: 0, height: 0 });
    expect(bench.heldBytes).toBe(80_000);
  });

  it('closes every bitmap on dispose', async () => {
    const bitmaps = [fakeBitmap(10, 10), fakeBitmap(10, 10)];
    const held = [...bitmaps];
    const bench = benchWith(bitmaps);
    await bench.decode('page');
    await bench.decode('slice');

    bench.dispose();

    expect(held.map((bitmap) => bitmap.closes)).toEqual([1, 1]);
    expect(bench.decoded).toEqual([]);
  });

  it('reports a failed decode by its cause and keeps what it held', async () => {
    const bench = benchWith([fakeBitmap(10, 10)], {});
    await bench.decode('page');

    await bench.decode('slice');

    expect(bench.status).toEqual({ kind: 'failed', sample: 'slice', message: 'no bitmap left' });
    expect(bench.decoded).toHaveLength(1);
  });

  it('starts no second decode while one runs', async () => {
    let calls = 0;
    const bench = benchWith([fakeBitmap(10, 10), fakeBitmap(10, 10)], {
      blobFor: () => {
        calls += 1;
        return Promise.resolve(new Blob([]));
      },
    });

    const first = bench.decode('page');
    const second = bench.decode('page');
    await Promise.all([first, second]);

    expect(calls).toBe(1);
  });
});
