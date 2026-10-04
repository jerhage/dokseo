import { describe, expect, it } from 'vitest';
import { describeValue } from '../../../domain/value-description';
import { POST_SAMPLES, Page } from './post-samples';

const RUNNABLE = POST_SAMPLES.filter((sample) => !sample.needsDocument);

describe('the post samples', () => {
  it.each(
    RUNNABLE.filter((sample) => sample.expected === 'clones').map((s) => [s.name, s] as const),
  )('clones %s the way the sample says it arrives', (_name, sample) => {
    const copy: unknown = structuredClone(sample.make());

    expect(describeValue(copy)).toBe(sample.arrives);
  });

  it.each(
    RUNNABLE.filter((sample) => sample.expected === 'throws').map((s) => [s.name, s] as const),
  )('rejects %s with a DataCloneError', (_name, sample) => {
    expect(() => structuredClone(sample.make())).toThrow(
      expect.objectContaining({ name: 'DataCloneError' }),
    );
  });

  it('keeps the method on the instance it sends', () => {
    expect(new Page(3).label()).toBe('Page 3');
  });
});

describe('describeValue', () => {
  it('names primitives with their type', () => {
    expect(describeValue('本')).toBe('string "本"');
    expect(describeValue(3)).toBe('number 3');
    expect(describeValue(5n)).toBe('bigint 5n');
    expect(describeValue(undefined)).toBe('undefined undefined');
    expect(describeValue(null)).toBe('null');
  });

  it('names buffers, views, arrays and sets by size', () => {
    expect(describeValue(new ArrayBuffer(8))).toBe('ArrayBuffer of 8 bytes');
    expect(describeValue(new Uint8Array(4))).toBe('Uint8Array of 4 bytes');
    expect(describeValue([1, 2])).toBe('Array of 2 items');
    expect(describeValue(new Set([1, 2]))).toBe('Set with 2 values');
  });

  it('names a class instance by its tag and lists its own fields', () => {
    expect(describeValue(new Page(3))).toBe('Object { number: number }');
  });

  it('runs from its own source text, as the echo worker does', () => {
    const rebuilt: unknown = new Function(`return (${describeValue.toString()})`)();

    expect(typeof rebuilt).toBe('function');
    if (typeof rebuilt !== 'function') return;
    expect(rebuilt({ a: 1 })).toBe('plain object { a: number }');
  });
});
