import { describe, expect, it } from 'vitest';
import type { LineGeometry } from './line-geometry';
import { LINE_CHANNELS, lineTensorData } from './line-tensor';

const GEOMETRY: LineGeometry = { drawnWidth: 2, tensorWidth: 3, height: 2 };

const PLANE = GEOMETRY.height * GEOMETRY.tensorWidth;

const RGBA = new Uint8ClampedArray([
  255, 0, 128, 255, 10, 200, 30, 255, 0, 0, 0, 255, 255, 255, 255, 255,
]);

function planeOf(data: Float32Array, channel: number): number[] {
  return Array.from(data.subarray(channel * PLANE, (channel + 1) * PLANE));
}

function expectClose(actual: readonly number[], expected: readonly number[]): void {
  expect(actual).toHaveLength(expected.length);
  expected.forEach((value, at) => {
    expect(actual[at]).toBeCloseTo(value, 5);
  });
}

describe('lineTensorData', () => {
  it('lays out three planes of the full tensor width', () => {
    expect(lineTensorData(RGBA, GEOMETRY)).toHaveLength(LINE_CHANNELS * PLANE);
  });

  it('puts blue in the first plane, green in the second and red in the third', () => {
    const data = lineTensorData(RGBA, GEOMETRY);

    expectClose(planeOf(data, 0), [0.003922, -0.764706, 0, -1, 1, 0]);
    expectClose(planeOf(data, 1), [-1, 0.568627, 0, -1, 1, 0]);
    expectClose(planeOf(data, 2), [1, -0.921569, 0, -1, 1, 0]);
  });

  it('maps a level to its fraction of 255, less 0.5, over 0.5', () => {
    const grey = new Uint8ClampedArray([0, 0, 0, 255, 51, 51, 51, 255]);
    const data = lineTensorData(grey, { drawnWidth: 2, tensorWidth: 2, height: 1 });

    expectClose(Array.from(data), [-1, -0.6, -1, -0.6, -1, -0.6]);
  });

  it('pads the columns past the drawn width with zero, the normalized mid level', () => {
    const data = lineTensorData(RGBA, GEOMETRY);

    for (let channel = 0; channel < LINE_CHANNELS; channel += 1) {
      const plane = planeOf(data, channel);
      expect(plane[2]).toBe(0);
      expect(plane[5]).toBe(0);
    }
  });
});
