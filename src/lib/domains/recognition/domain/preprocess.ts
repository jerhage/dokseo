import type { Size } from '$lib/shared/geometry';

export const UPSCALE = 3;

export const MAX_CROP_EDGE = 2048;

export const LIGHT_ON_DARK_LUMINANCE = 0.35;

export function upscaleFor(size: Size): number {
  const edge = Math.max(size.width, size.height);
  if (!Number.isFinite(edge) || edge <= 0) return UPSCALE;

  return Math.max(1, Math.min(UPSCALE, MAX_CROP_EDGE / edge));
}

export function shouldInvert(meanLuminance: number): boolean {
  return Number.isFinite(meanLuminance) && meanLuminance < LIGHT_ON_DARK_LUMINANCE;
}
