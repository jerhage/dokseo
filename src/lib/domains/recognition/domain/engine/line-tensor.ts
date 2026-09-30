import type { LineGeometry } from './line-geometry';

const LINE_CHANNELS = 3;

const MID_LEVEL = 0.5;

const FULL_LEVEL = 255;

function normalized(level: number): number {
  return (level / FULL_LEVEL - MID_LEVEL) / MID_LEVEL;
}

function lineTensorData(rgba: Uint8ClampedArray, geometry: LineGeometry): Float32Array {
  const plane = geometry.height * geometry.tensorWidth;
  const data = new Float32Array(LINE_CHANNELS * plane);

  for (let row = 0; row < geometry.height; row += 1) {
    for (let column = 0; column < geometry.drawnWidth; column += 1) {
      const from = (row * geometry.drawnWidth + column) * 4;
      const to = row * geometry.tensorWidth + column;
      data[to] = normalized(rgba[from + 2] ?? 0);
      data[plane + to] = normalized(rgba[from + 1] ?? 0);
      data[2 * plane + to] = normalized(rgba[from] ?? 0);
    }
  }

  return data;
}

export { LINE_CHANNELS, lineTensorData };
