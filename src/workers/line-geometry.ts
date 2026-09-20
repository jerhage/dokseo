const LINE_HEIGHT = 48;

const MIN_LINE_WIDTH = 320;

const MAX_LINE_WIDTH = 3200;

type LineGeometry = {
  readonly drawnWidth: number;
  readonly tensorWidth: number;
  readonly height: number;
};

function lineGeometry(width: number, height: number): LineGeometry {
  const ratio = width > 0 && height > 0 ? width / height : 1;
  const drawnWidth = Math.min(MAX_LINE_WIDTH, Math.max(1, Math.ceil(LINE_HEIGHT * ratio)));

  return {
    drawnWidth,
    tensorWidth: Math.max(MIN_LINE_WIDTH, drawnWidth),
    height: LINE_HEIGHT,
  };
}

export { LINE_HEIGHT, MIN_LINE_WIDTH, MAX_LINE_WIDTH, lineGeometry };
export type { LineGeometry };
