import { describe, expect, it } from 'vitest';
import { checkSnippets } from '../snippet-checks';
import { UNICODE_SECTIONS } from './unicode-sections';
import { ENCODING_LAYERS, NORMALIZATION_SQUARE } from './unicode-diagrams';
import * as quotes from './unicode-snippets';

checkSnippets('the Unicode page snippets', quotes.UNICODE_SNIPPETS, quotes);

describe('the Unicode diagrams', () => {
  it.each([ENCODING_LAYERS, NORMALIZATION_SQUARE])(
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

describe('the Unicode sections', () => {
  it('titles every section differently', () => {
    const titles = Object.values(UNICODE_SECTIONS);

    expect(new Set(titles).size).toBe(titles.length);
  });
});
