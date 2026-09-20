export const LINE_HEIGHT = 48;

export const MIN_LINE_WIDTH = 320;

export const MAX_LINE_WIDTH = 3200;

export type LineGeometry = {
  readonly drawnWidth: number;
  readonly tensorWidth: number;
  readonly height: number;
};

export function lineGeometry(width: number, height: number): LineGeometry {
  const ratio = width > 0 && height > 0 ? width / height : 1;
  const drawnWidth = Math.min(MAX_LINE_WIDTH, Math.max(1, Math.ceil(LINE_HEIGHT * ratio)));

  return {
    drawnWidth,
    tensorWidth: Math.max(MIN_LINE_WIDTH, drawnWidth),
    height: LINE_HEIGHT,
  };
}
