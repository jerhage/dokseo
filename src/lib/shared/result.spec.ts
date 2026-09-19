import { describe, expect, it } from 'vitest';
import { err, map, ok, unwrapOr, type Result } from './result';

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

describe('map', () => {
	it('transforms the value of a success', () => {
		const r: Result<number, string> = ok(2);
		expect(map(r, (n) => n * 3)).toEqual({ ok: true, value: 6 });
	});

	it('leaves a failure untouched', () => {
		const r: Result<number, string> = err('boom');
		expect(map(r, (n) => n * 3)).toEqual({ ok: false, error: 'boom' });
	});

	it('does not call the function on a failure', () => {
		let calls = 0;
		const r: Result<number, string> = err('boom');
		map(r, (n) => {
			calls += 1;
			return n;
		});
		expect(calls).toBe(0);
	});
});

describe('unwrapOr', () => {
	it('returns the value of a success', () => {
		expect(unwrapOr(ok(7), 0)).toBe(7);
	});

	it('returns the fallback for a failure', () => {
		const r: Result<number, string> = err('boom');
		expect(unwrapOr(r, 0)).toBe(0);
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
