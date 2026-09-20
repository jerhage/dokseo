import { describe, expect, it } from 'vitest';
import { lineGeometry, LINE_HEIGHT, MAX_LINE_WIDTH, MIN_LINE_WIDTH } from './line-geometry';

describe('lineGeometry', () => {
  it('scales every line to the height the model was exported for', () => {
    expect(lineGeometry(900, 120).height).toBe(LINE_HEIGHT);
  });

  it('keeps the aspect ratio of the line it draws', () => {
    expect(lineGeometry(1000, 100).drawnWidth).toBe(480);
  });

  it('pads a short line out to the narrowest shape the model was exported for', () => {
    const geometry = lineGeometry(100, 100);

    expect(geometry.drawnWidth).toBe(48);
    expect(geometry.tensorWidth).toBe(MIN_LINE_WIDTH);
  });

  it('caps a very wide line at the widest shape the model declares', () => {
    const geometry = lineGeometry(100_000, 48);

    expect(geometry.drawnWidth).toBe(MAX_LINE_WIDTH);
    expect(geometry.tensorWidth).toBe(MAX_LINE_WIDTH);
  });

  it('never draws wider than the tensor the drawing is placed in', () => {
    for (const width of [1, 40, 319, 320, 1_600, 9_000]) {
      const geometry = lineGeometry(width, 48);
      expect(geometry.drawnWidth).toBeLessThanOrEqual(geometry.tensorWidth);
    }
  });

  it('draws at least one column of a line with no measurable size', () => {
    expect(lineGeometry(0, 0).drawnWidth).toBe(LINE_HEIGHT);
  });
});
