import { describe, expect, it } from 'vitest';
import { DEVICE_PRESETS } from '../../../domain/pointer-devices';
import { DEVICE_SETTINGS, GESTURE_TREE } from './touch-diagrams';

describe('the touch and pointers diagrams', () => {
  it.each([GESTURE_TREE, DEVICE_SETTINGS])('keeps every node inside the drawing', (diagram) => {
    for (const node of diagram.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x + node.width).toBeLessThanOrEqual(diagram.width);
      expect(node.y + node.height).toBeLessThanOrEqual(diagram.height);
    }
    expect(diagram.width).toBeLessThanOrEqual(360);
  });

  it.each([GESTURE_TREE, DEVICE_SETTINGS])('draws edges only between its own nodes', (diagram) => {
    for (const edge of diagram.edges) {
      expect(diagram.nodes).toContain(edge.from);
      expect(diagram.nodes).toContain(edge.to);
    }
  });

  it('links the iPad with a trackpad to both queries and the desktop to hover alone', () => {
    const targets = (index: number) =>
      DEVICE_SETTINGS.edges
        .filter((edge) => edge.from === DEVICE_SETTINGS.nodes[index])
        .map((edge) => edge.to.label);

    expect(targets(DEVICE_PRESETS.findIndex((preset) => preset.key === 'ipad-trackpad'))).toEqual([
      'any-pointer',
      'any-hover',
    ]);
    expect(targets(DEVICE_PRESETS.findIndex((preset) => preset.key === 'desktop'))).toEqual([
      'any-hover',
    ]);
    expect(targets(DEVICE_PRESETS.findIndex((preset) => preset.key === 'ipad-pencil'))).toEqual([
      'any-pointer',
    ]);
  });
});
