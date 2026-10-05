import { describe, expect, it } from 'vitest';
import { checkSnippets } from '../snippet-checks';
import type { DiagramSpec } from '../testing/testing-diagrams';
import {
  NARROWING_SAMPLES,
  narrowingPath,
  narrowingTree,
  sampleNamed,
  shownSample,
} from './narrowing-tree';
import { PARSE_BOUNDARY } from './type-diagrams';
import { TYPE_SECTIONS } from './type-sections';
import * as quotes from './type-snippets';

function toneOf(diagram: DiagramSpec, label: string): string | undefined {
  const node = diagram.nodes.find((candidate) => candidate.label === label);
  return node?.tone;
}

checkSnippets('the TypeScript page snippets', quotes.TYPE_SNIPPETS, quotes);

describe('narrowingPath', () => {
  it('ends each sample at its own leaf, passing the checks above it', () => {
    expect(NARROWING_SAMPLES.map((sample) => narrowingPath(sample.value))).toEqual([
      { passed: [], end: 'null' },
      { passed: ['null'], end: 'string' },
      { passed: ['null', 'string'], end: 'date' },
      { passed: ['null', 'string', 'date'], end: 'region' },
      { passed: ['null', 'string', 'date', 'region'], end: 'text' },
    ]);
  });
});

describe('narrowingTree', () => {
  it('lights the checks a Date reaches and the Date leaf, and nothing below', () => {
    const tree = narrowingTree(narrowingPath(sampleNamed('date').value));

    expect(toneOf(tree, 'value === null')).toBe('primary');
    expect(toneOf(tree, "typeof value === 'string'")).toBe('primary');
    expect(toneOf(tree, 'value instanceof Date')).toBe('primary');
    expect(toneOf(tree, "value.kind === 'region'")).toBe('neutral');
    expect(toneOf(tree, 'Date')).toBe('accent');
    expect(toneOf(tree, 'string')).toBe('neutral');
  });

  it('draws a yes edge to each leaf and a no edge down the chain', () => {
    const tree = narrowingTree(narrowingPath(null));

    expect(tree.edges.filter((edge) => edge.label === 'yes')).toHaveLength(4);
    expect(tree.edges.filter((edge) => edge.label === 'no')).toHaveLength(4);
  });
});

describe('the samples', () => {
  it('finds every sample by its name', () => {
    expect(NARROWING_SAMPLES.every((sample) => sampleNamed(sample.name) === sample)).toBe(true);
  });

  it('shows a Date as a constructor call and an anchor as JSON', () => {
    expect(shownSample(sampleNamed('date').value)).toBe("new Date('2026-10-04T00:00:00.000Z')");
    expect(shownSample(sampleNamed('nothing').value)).toBe('null');
    expect(shownSample(sampleNamed('region').value)).toContain('"kind": "region"');
  });
});

describe('the TypeScript page diagrams', () => {
  it.each([PARSE_BOUNDARY, narrowingTree(narrowingPath(null))])(
    'keeps every node inside the drawing',
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

describe('the TypeScript page sections', () => {
  it('titles every section differently', () => {
    const titles = Object.values(TYPE_SECTIONS);

    expect(new Set(titles).size).toBe(titles.length);
  });
});
