import { describe, expect, it } from 'vitest';
import { err, ok, type Result } from './result';

describe('ok', () => {
  it('wraps a value in a success', () => {
    expect(ok(42)).toEqual({ ok: true, value: 42 });
  });
});

describe('err', () => {
  it('wraps a value in a failure', () => {
    expect(err('boom')).toEqual({ ok: false, error: 'boom' });
  });
});

describe('narrowing', () => {
  it('exposes value only on the success branch', () => {
    const r: Result<string, number> = ok('text');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toBe('text');
    }
  });
});
