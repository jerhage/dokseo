type Size = { readonly width: number; readonly height: number };

declare const space: unique symbol;

type Rect<in out S extends string> = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly [space]: (s: S) => S;
};

type ScreenRect = Rect<'screen'>;

type ImageRect = Rect<'image'>;

type PageRect = Rect<'page'>;

function rect<S extends string>(x: number, y: number, width: number, height: number): Rect<S> {
  return { x, y, width, height } as Rect<S>;
}

type Edges = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

function screenRect(x: number, y: number, width: number, height: number): ScreenRect {
  return rect<'screen'>(x, y, width, height);
}

function imageRect(x: number, y: number, width: number, height: number): ImageRect {
  return rect<'image'>(x, y, width, height);
}

function pageRect(x: number, y: number, width: number, height: number): PageRect {
  return rect<'page'>(x, y, width, height);
}

const WHOLE_PAGE = pageRect(0, 0, 1, 1);

const PIXEL_NOISE = 1e-6;

function fitsOnPage(r: Edges): boolean {
  const finite = [r.x, r.y, r.width, r.height].every(Number.isFinite);
  return (
    finite &&
    r.x >= 0 &&
    r.y >= 0 &&
    r.width > 0 &&
    r.height > 0 &&
    r.x + r.width <= 1 &&
    r.y + r.height <= 1
  );
}

function isPositiveSize(size: Size): boolean {
  return (
    Number.isFinite(size.width) && Number.isFinite(size.height) && size.width > 0 && size.height > 0
  );
}

function pageRectOf(r: ImageRect, natural: Size): PageRect | null {
  if (!isPositiveSize(natural)) return null;

  const pixels = normalize(r);
  const scaled = pageRect(
    pixels.x / natural.width,
    pixels.y / natural.height,
    pixels.width / natural.width,
    pixels.height / natural.height,
  );
  const box = clampTo(scaled, WHOLE_PAGE);

  return fitsOnPage(box) ? box : null;
}

function wholeWhenNear(value: number): number {
  const whole = Math.round(value);
  return Math.abs(value - whole) < PIXEL_NOISE ? whole : value;
}

function imageRectOf(r: PageRect, natural: Size): ImageRect {
  const left = wholeWhenNear(r.x * natural.width);
  const top = wholeWhenNear(r.y * natural.height);
  const right = wholeWhenNear((r.x + r.width) * natural.width);
  const bottom = wholeWhenNear((r.y + r.height) * natural.height);
  return imageRect(left, top, right - left, bottom - top);
}

function normalize<S extends string>(r: Rect<S>): Rect<S> {
  const x = r.width < 0 ? r.x + r.width : r.x;
  const y = r.height < 0 ? r.y + r.height : r.y;
  return rect<S>(x, y, Math.abs(r.width), Math.abs(r.height));
}

function clampTo<S extends string>(r: Rect<S>, bounds: Rect<S>): Rect<S> {
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
    Math.max(0, bottom - top),
  );
}

function isEmpty<S extends string>(r: Rect<S>): boolean {
  return r.width <= 0 || r.height <= 0;
}

export {
  screenRect,
  imageRect,
  pageRect,
  normalize,
  clampTo,
  isEmpty,
  fitsOnPage,
  pageRectOf,
  imageRectOf,
};
export type { Size, Rect, ScreenRect, ImageRect, PageRect };
