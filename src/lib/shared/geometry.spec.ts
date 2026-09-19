import { describe, expect, it } from 'vitest';
import { clampTo, imageRect, isEmpty, normalize, screenRect } from './geometry';

const plain = (r: { x: number; y: number; width: number; height: number }) => ({
	x: r.x,
	y: r.y,
	width: r.width,
	height: r.height
});

describe('constructors', () => {
	it('builds a plain object with no runtime brand', () => {
		const r = screenRect(1, 2, 3, 4);
		expect(plain(r)).toEqual({ x: 1, y: 2, width: 3, height: 4 });
		expect(Object.keys(r)).toEqual(['x', 'y', 'width', 'height']);
		expect(Object.getOwnPropertySymbols(r)).toEqual([]);
	});

	it('builds image rects the same way', () => {
		expect(plain(imageRect(10, 20, 30, 40))).toEqual({ x: 10, y: 20, width: 30, height: 40 });
	});
});

describe('normalize', () => {
	it('leaves a positive rect unchanged', () => {
		expect(plain(normalize(screenRect(5, 6, 10, 20)))).toEqual({ x: 5, y: 6, width: 10, height: 20 });
	});

	it('moves the origin left for a negative width', () => {
		expect(plain(normalize(screenRect(100, 10, -40, 20)))).toEqual({
			x: 60,
			y: 10,
			width: 40,
			height: 20
		});
	});

	it('moves the origin up for a negative height', () => {
		expect(plain(normalize(screenRect(10, 100, 40, -25)))).toEqual({
			x: 10,
			y: 75,
			width: 40,
			height: 25
		});
	});

	it('handles a drag that is backwards on both axes', () => {
		expect(plain(normalize(screenRect(100, 100, -40, -25)))).toEqual({
			x: 60,
			y: 75,
			width: 40,
			height: 25
		});
	});

	it('returns a new object rather than mutating its argument', () => {
		const r = screenRect(100, 100, -40, -25);
		const n = normalize(r);
		expect(n).not.toBe(r);
		expect(plain(r)).toEqual({ x: 100, y: 100, width: -40, height: -25 });
	});

	it('keeps a zero-size rect at zero', () => {
		expect(plain(normalize(imageRect(3, 4, 0, 0)))).toEqual({ x: 3, y: 4, width: 0, height: 0 });
	});
});

describe('clampTo', () => {
	const bounds = imageRect(0, 0, 100, 100);

	it('returns a rect that is fully inside unchanged', () => {
		expect(plain(clampTo(imageRect(10, 10, 30, 30), bounds))).toEqual({
			x: 10,
			y: 10,
			width: 30,
			height: 30
		});
	});

	it('trims a rect that overhangs the right and bottom edges', () => {
		expect(plain(clampTo(imageRect(80, 90, 40, 40), bounds))).toEqual({
			x: 80,
			y: 90,
			width: 20,
			height: 10
		});
	});

	it('trims a rect that overhangs the left and top edges', () => {
		expect(plain(clampTo(imageRect(-20, -30, 50, 60), bounds))).toEqual({
			x: 0,
			y: 0,
			width: 30,
			height: 30
		});
	});

	it('collapses a rect that lies entirely past the far edges', () => {
		const clamped = clampTo(imageRect(200, 300, 50, 50), bounds);
		expect(plain(clamped)).toEqual({ x: 100, y: 100, width: 0, height: 0 });
		expect(isEmpty(clamped)).toBe(true);
	});

	it('collapses a rect that lies entirely before the near edges', () => {
		const clamped = clampTo(imageRect(-200, -300, 50, 50), bounds);
		expect(plain(clamped)).toEqual({ x: 0, y: 0, width: 0, height: 0 });
		expect(isEmpty(clamped)).toBe(true);
	});

	it('clamps against bounds whose origin is not zero', () => {
		expect(plain(clampTo(imageRect(0, 0, 100, 100), imageRect(20, 20, 50, 50)))).toEqual({
			x: 20,
			y: 20,
			width: 50,
			height: 50
		});
	});

	it('normalizes a backwards drag before clamping', () => {
		expect(plain(clampTo(imageRect(50, 50, -80, -80), bounds))).toEqual({
			x: 0,
			y: 0,
			width: 50,
			height: 50
		});
	});

	it('returns a new object rather than mutating its argument', () => {
		const r = imageRect(10, 10, 30, 30);
		expect(clampTo(r, bounds)).not.toBe(r);
	});
});

describe('isEmpty', () => {
	it('is false for a rect with both extents positive', () => {
		expect(isEmpty(screenRect(0, 0, 1, 1))).toBe(false);
	});

	it('is true for a zero width', () => {
		expect(isEmpty(screenRect(0, 0, 0, 10))).toBe(true);
	});

	it('is true for a zero height', () => {
		expect(isEmpty(screenRect(0, 0, 10, 0))).toBe(true);
	});

	it('is true for a rect with no extent at all', () => {
		expect(isEmpty(imageRect(5, 5, 0, 0))).toBe(true);
	});

	it('is true for a rect that was never normalized', () => {
		expect(isEmpty(screenRect(10, 10, -5, 20))).toBe(true);
	});
});
