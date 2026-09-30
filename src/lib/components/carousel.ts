import { match } from 'ts-pattern';
import { pixelLength } from './css-length';
import type { StyleSource } from './css-length';

type CarouselSide = -1 | 1;

type CarouselBeside = CarouselSide | 0;

type CarouselDirection = 'ltr' | 'rtl';

type CarouselSlide = { readonly key: string | number; readonly beside: CarouselBeside };

type CarouselNeighbours = { readonly before: boolean; readonly after: boolean };

type CarouselScene = {
  readonly width: number;
  readonly gap: number;
  readonly direction: CarouselDirection;
  readonly neighbours: CarouselNeighbours;
};

type CarouselMotion =
  | { readonly kind: 'rest' }
  | { readonly kind: 'follow'; readonly offset: number }
  | { readonly kind: 'settle'; readonly offset: number; readonly towards: CarouselSide | null };

type CarouselInput =
  | { readonly kind: 'follow'; readonly travel: number }
  | { readonly kind: 'release'; readonly towards: CarouselSide | null };

const CAROUSEL_GAP_PROPERTY = '--carousel-gap';

const CAROUSEL_RESISTANCE = 0.55;

const CAROUSEL_REST: CarouselMotion = { kind: 'rest' };

const SWIPE_SHARE = 0.25;

const FLICK_PX_PER_MS = 0.4;

const FLICK_MIN_PX = 24;

const SETTLE_FALLBACK_MARGIN_MS = 220;

function carouselGap(style: StyleSource): number {
  return pixelLength(style, CAROUSEL_GAP_PROPERTY);
}

const SETTLES_AT_ONCE = 0;

function timeMs(time: string): number | null {
  const text = time.trim();
  const amount = Number.parseFloat(text);
  if (!Number.isFinite(amount) || amount < 0) return null;
  if (text.endsWith('ms')) return amount;
  return text.endsWith('s') ? Math.round(amount * 1000) : null;
}

function settleFallbackMs(transitionDuration: string): number {
  const times = transitionDuration.split(',').map(timeMs);
  const readable = times.filter((time) => time !== null);
  const longest = Math.max(0, ...readable);
  if (readable.length === times.length && longest === 0) return SETTLES_AT_ONCE;
  return longest + SETTLE_FALLBACK_MARGIN_MS;
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function screenSide(beside: CarouselBeside, direction: CarouselDirection): CarouselBeside {
  if (beside === 0 || direction === 'ltr') return beside;
  return beside === 1 ? -1 : 1;
}

function revealedSide(travel: number, direction: CarouselDirection): CarouselSide {
  const onScreen: CarouselSide = travel < 0 ? 1 : -1;
  return direction === 'ltr' ? onScreen : onScreen === 1 ? -1 : 1;
}

function holdsSide(neighbours: CarouselNeighbours, side: CarouselSide): boolean {
  return side === 1 ? neighbours.after : neighbours.before;
}

function carouselNeighbours(slides: readonly CarouselSlide[]): CarouselNeighbours {
  return {
    before: slides.some((slide) => slide.beside === -1),
    after: slides.some((slide) => slide.beside === 1),
  };
}

function carouselAround(index: number, count: number): readonly CarouselSlide[] {
  const placed: readonly (readonly [number, CarouselBeside])[] = [
    [index - 1, -1],
    [index, 0],
    [index + 1, 1],
  ];
  return placed
    .filter(([key]) => Number.isInteger(key) && key >= 0 && key < count)
    .map(([key, beside]) => ({ key, beside }));
}

function resisted(travel: number, width: number): number {
  const pulled = (Math.abs(travel) * CAROUSEL_RESISTANCE) / width;
  return Math.sign(travel) * (1 - 1 / (pulled + 1)) * width;
}

function carouselOffset(travel: number, scene: CarouselScene): number {
  if (!Number.isFinite(travel) || travel === 0 || !isPositiveFinite(scene.width)) return 0;

  if (!holdsSide(scene.neighbours, revealedSide(travel, scene.direction))) {
    return resisted(travel, scene.width);
  }

  const reach = scene.width + scene.gap;
  return Math.max(-reach, Math.min(reach, travel));
}

function settleFrom(
  offset: number,
  towards: CarouselSide | null,
  scene: CarouselScene,
): CarouselMotion {
  if (offset === 0) return CAROUSEL_REST;
  if (towards === null || !holdsSide(scene.neighbours, towards)) {
    return { kind: 'settle', offset: 0, towards: null };
  }

  const across = scene.width + scene.gap;
  return { kind: 'settle', offset: -screenSide(towards, scene.direction) * across, towards };
}

function carouselStep(
  motion: CarouselMotion,
  input: CarouselInput,
  scene: CarouselScene,
): CarouselMotion {
  if (input.kind === 'follow') {
    return motion.kind === 'settle'
      ? motion
      : { kind: 'follow', offset: carouselOffset(input.travel, scene) };
  }

  return match<CarouselMotion, CarouselMotion>(motion)
    .with({ kind: 'rest' }, { kind: 'settle' }, () => motion)
    .with({ kind: 'follow' }, ({ offset }) => settleFrom(offset, input.towards, scene))
    .exhaustive();
}

function carouselShift(motion: CarouselMotion): number {
  return match(motion)
    .with({ kind: 'rest' }, () => 0)
    .with({ kind: 'follow' }, { kind: 'settle' }, ({ offset }) => offset)
    .exhaustive();
}

function isFlick(distance: number, elapsedMs: number): boolean {
  return distance >= FLICK_MIN_PX && elapsedMs > 0 && distance / elapsedMs >= FLICK_PX_PER_MS;
}

function swipeRelease(
  travel: number,
  elapsedMs: number,
  width: number,
  direction: CarouselDirection,
): CarouselSide | null {
  if (!Number.isFinite(travel) || travel === 0 || !isPositiveFinite(width)) return null;

  const distance = Math.abs(travel);
  const far = distance >= width * SWIPE_SHARE;
  return far || isFlick(distance, elapsedMs) ? revealedSide(travel, direction) : null;
}

export {
  CAROUSEL_RESISTANCE,
  CAROUSEL_REST,
  SETTLE_FALLBACK_MARGIN_MS,
  SETTLES_AT_ONCE,
  carouselAround,
  carouselGap,
  carouselNeighbours,
  carouselOffset,
  carouselShift,
  carouselStep,
  holdsSide,
  isFlick,
  revealedSide,
  screenSide,
  settleFallbackMs,
  swipeRelease,
};
export type {
  CarouselBeside,
  CarouselDirection,
  CarouselInput,
  CarouselMotion,
  CarouselNeighbours,
  CarouselScene,
  CarouselSide,
  CarouselSlide,
};
