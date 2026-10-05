import { describe, expect, it } from 'vitest';
import { exportedSnippets, unlistedSnippets } from './snippet-checks';

const LISTED = { label: 'listed', file: 'a.ts', code: 'a' };

const LEFT_OUT = { label: 'left out', file: 'b.ts', code: 'b' };

const GROUPED = { label: 'grouped', file: 'c.ts', code: 'c' };

const SAMPLE_MODULE = {
  LISTED,
  LEFT_OUT,
  GROUP: [GROUPED, 'not a quote'],
  SNIPPETS: [LISTED],
  NAME: 'a plain string',
  NAMES: { prefix: '--ds-' },
  HALF: { label: 'no file', code: 'x' },
};

describe('exportedSnippets', () => {
  it('collects every exported quote and every quote inside an exported array', () => {
    expect(exportedSnippets(SAMPLE_MODULE)).toEqual([LISTED, LEFT_OUT, GROUPED, LISTED]);
  });
});

describe('unlistedSnippets', () => {
  it('names each exported quote the array leaves out', () => {
    expect(unlistedSnippets(SAMPLE_MODULE, [LISTED])).toEqual(['left out', 'grouped']);
  });

  it('reports nothing once every quote is listed', () => {
    expect(unlistedSnippets(SAMPLE_MODULE, [LISTED, LEFT_OUT, GROUPED])).toEqual([]);
  });

  it('counts an equal copy of a listed quote as left out', () => {
    expect(unlistedSnippets({ COPY: { ...LISTED } }, [LISTED])).toEqual(['listed']);
  });
});
