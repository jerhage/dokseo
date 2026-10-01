import { describe, expect, it } from 'vitest';
import { unreachable } from './unreachable';

describe('unreachable', () => {
  it('throws, naming the value no branch handled', () => {
    const escaped = { kind: 'fifth' } as never;

    expect(() => unreachable(escaped)).toThrow('No branch handles {"kind":"fifth"}');
  });
});
