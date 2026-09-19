declare const space: unique symbol;

export type Rect<in out S extends string> = {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	readonly [space]: (s: S) => S;
};

export type ScreenRect = Rect<'screen'>;

export type ImageRect = Rect<'image'>;

function rect<S extends string>(x: number, y: number, width: number, height: number): Rect<S> {
	return { x, y, width, height } as Rect<S>;
}

export function screenRect(x: number, y: number, width: number, height: number): ScreenRect {
	return rect<'screen'>(x, y, width, height);
}

export function imageRect(x: number, y: number, width: number, height: number): ImageRect {
	return rect<'image'>(x, y, width, height);
}

export function normalize<S extends string>(r: Rect<S>): Rect<S> {
	const x = r.width < 0 ? r.x + r.width : r.x;
	const y = r.height < 0 ? r.y + r.height : r.y;
	return rect<S>(x, y, Math.abs(r.width), Math.abs(r.height));
}

export function clampTo<S extends string>(r: Rect<S>, bounds: Rect<S>): Rect<S> {
	const a = normalize(r);
	const b = normalize(bounds);

	const left = Math.max(a.x, b.x);
	const top = Math.max(a.y, b.y);
	const right = Math.min(a.x + a.width, b.x + b.width);
	const bottom = Math.min(a.y + a.height, b.y + b.height);

	return rect<S>(
		Math.min(left, b.x + b.width),
		Math.min(top, b.y + b.height),
		Math.max(0, right - left),
		Math.max(0, bottom - top)
	);
}

export function isEmpty<S extends string>(r: Rect<S>): boolean {
	return r.width <= 0 || r.height <= 0;
}
