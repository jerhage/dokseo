import { describe, expect, it } from 'vitest';
import {
  INTERCEPTION,
  LIFECYCLE,
  UPDATE_STEPS,
  UPDATE_TIMELINE,
  timeline,
} from './offline-diagrams';

describe('timeline', () => {
  it('links each step to the next and none other', () => {
    const drawn = timeline(UPDATE_STEPS);

    expect(drawn.nodes.map((node) => node.label)).toEqual(UPDATE_STEPS.map((step) => step.label));
    expect(drawn.edges.map((edge) => [edge.from.label, edge.to.label])).toEqual(
      UPDATE_STEPS.slice(1).map((step, index) => [UPDATE_STEPS[index]?.label, step.label]),
    );
  });

  it('sizes the drawing to end just below the last step', () => {
    const last = UPDATE_TIMELINE.nodes.at(-1);

    expect(last).toBeDefined();
    expect(UPDATE_TIMELINE.height).toBe((last?.y ?? 0) + (last?.height ?? 0) + 8);
  });
});

describe('the offline diagrams', () => {
  it.each([INTERCEPTION, LIFECYCLE, UPDATE_TIMELINE])(
    'keeps every box inside the drawing',
    (diagram) => {
      for (const node of diagram.nodes) {
        expect(node.x).toBeGreaterThanOrEqual(0);
        expect(node.x + node.width).toBeLessThanOrEqual(diagram.width);
        expect(node.y + node.height).toBeLessThanOrEqual(diagram.height);
      }
      expect(diagram.width).toBeLessThanOrEqual(360);
    },
  );
});
