import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { UNICODE_SECTIONS } from './unicode-sections';
import { ENCODING_LAYERS, NORMALIZATION_SQUARE } from './unicode-diagrams';
import { UNICODE_SNIPPETS } from './unicode-snippets';

function unindented(code: string): string {
  return code
    .split('\n')
    .map((line) => line.trimStart())
    .join('\n');
}

describe('the Unicode page snippets', () => {
  it.each(UNICODE_SNIPPETS.map((snippet) => [snippet.label, snippet] as const))(
    'quotes %s exactly as the source file has it',
    (_label, snippet) => {
      const source = readFileSync(snippet.file, 'utf8');

      expect(unindented(source)).toContain(unindented(snippet.code));
    },
  );
});

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
