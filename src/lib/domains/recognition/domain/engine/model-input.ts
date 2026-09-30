import type { Size } from '$lib/shared/geometry';

const MAX_MODEL_INPUT_EDGE = 2048;

function downscaleFor(size: Size, limit: number = MAX_MODEL_INPUT_EDGE): number {
  const edge = Math.max(size.width, size.height);
  if (!Number.isFinite(edge) || edge <= 0) return 1;

  return Math.min(1, limit / edge);
}

export { MAX_MODEL_INPUT_EDGE, downscaleFor };
