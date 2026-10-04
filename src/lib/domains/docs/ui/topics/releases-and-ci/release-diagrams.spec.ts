import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RELEASE_DIAGRAMS, VERIFY_LADDER } from './release-diagrams';

describe('the releases and CI diagrams', () => {
  it.each(RELEASE_DIAGRAMS)('keeps every node inside the drawing', (diagram) => {
    for (const node of diagram.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x + node.width).toBeLessThanOrEqual(diagram.width);
      expect(node.y + node.height).toBeLessThanOrEqual(diagram.height);
    }
    expect(diagram.width).toBeLessThanOrEqual(360);
  });

  it.each(RELEASE_DIAGRAMS)('draws edges only between its own nodes', (diagram) => {
    for (const edge of diagram.edges) {
      expect(diagram.nodes).toContain(edge.from);
      expect(diagram.nodes).toContain(edge.to);
    }
  });

  it('names only verify scripts that package.json defines', () => {
    const manifest: { scripts: Record<string, string> } = JSON.parse(
      readFileSync('package.json', 'utf8'),
    );

    for (const node of VERIFY_LADDER.nodes) expect(manifest.scripts).toHaveProperty([node.label]);
  });
});
