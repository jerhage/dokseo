import type { TocItem } from 'foliate-js/view.js';
import { describe, expect, it } from 'vitest';
import {
  currentEntryKey,
  entryLabel,
  flowContents,
  indentDepth,
  MAX_INDENT_DEPTH,
  UNNAMED_ENTRY_LABEL,
} from './flow-contents';
import type { ContentsEntry, FlowContents } from './flow-contents';

function listed(contents: FlowContents): readonly ContentsEntry[] {
  return contents.kind === 'listed' ? contents.entries : [];
}

function shape(contents: FlowContents): readonly string[] {
  return listed(contents).map((entry) => `${entry.key} ${entry.depth} ${entry.kind}`);
}

function labels(contents: FlowContents): readonly (string | null)[] {
  return listed(contents).map((entry) => entry.label);
}

describe('flowContents', () => {
  it('reports no contents for a book that carries no navigation at all', () => {
    expect(flowContents(null)).toEqual({ kind: 'absent' });
    expect(flowContents(undefined)).toEqual({ kind: 'absent' });
  });

  it('reports no contents for a navigation that holds no entries', () => {
    expect(flowContents([])).toEqual({ kind: 'absent' });
  });

  it('lists an entry that names a place and goes to one as a link', () => {
    const contents = flowContents([{ label: 'Chapter One', href: 'ch1.xhtml' }]);

    expect(listed(contents)).toEqual([
      {
        kind: 'link',
        key: '0',
        depth: 0,
        label: 'Chapter One',
        href: 'ch1.xhtml',
        item: { label: 'Chapter One', href: 'ch1.xhtml' },
      },
    ]);
  });

  it('lists an entry that goes nowhere as a heading rather than a link', () => {
    expect(shape(flowContents([{ label: 'Part One', href: null }]))).toEqual(['0 0 heading']);
    expect(shape(flowContents([{ label: 'Part One' }]))).toEqual(['0 0 heading']);
    expect(shape(flowContents([{ label: 'Part One', href: '   ' }]))).toEqual(['0 0 heading']);
  });

  it('keeps no href on a heading, so nothing can navigate to one', () => {
    const [heading] = listed(flowContents([{ label: 'Part One' }]));

    expect(heading?.kind).toBe('heading');
    expect(heading).not.toHaveProperty('href');
  });

  it('names an entry whose label is missing, empty or blank as nothing', () => {
    expect(labels(flowContents([{ href: 'ch1.xhtml' }]))).toEqual([null]);
    expect(labels(flowContents([{ label: null, href: 'ch1.xhtml' }]))).toEqual([null]);
    expect(labels(flowContents([{ label: '', href: 'ch1.xhtml' }]))).toEqual([null]);
    expect(labels(flowContents([{ label: ' \n ', href: 'ch1.xhtml' }]))).toEqual([null]);
  });

  it('collapses the whitespace a navigation heading was laid out with', () => {
    expect(labels(flowContents([{ label: '\n  第一章\n  上\n', href: 'ch1.xhtml' }]))).toEqual([
      '第一章 上',
    ]);
  });

  it('drops an entry that neither names a place nor goes to one', () => {
    expect(flowContents([{ label: '  ', href: null }])).toEqual({ kind: 'absent' });
    expect(flowContents([{}])).toEqual({ kind: 'absent' });
  });

  it('keeps the children of an entry it dropped', () => {
    const contents = flowContents([
      { subitems: [{ label: 'Chapter One', href: 'ch1.xhtml' }] },
      { label: 'Chapter Two', href: 'ch2.xhtml' },
    ]);

    expect(shape(contents)).toEqual(['0.0 1 link', '1 0 link']);
  });

  it('flattens a nested navigation into reading order, carrying the depth of each entry', () => {
    const contents = flowContents([
      {
        label: 'Part One',
        href: 'p1.xhtml',
        subitems: [
          { label: 'Chapter One', href: 'ch1.xhtml' },
          {
            label: 'Chapter Two',
            href: 'ch2.xhtml',
            subitems: [{ label: 'A Scene', href: 'ch2.xhtml#s1' }],
          },
        ],
      },
      { label: 'Part Two', href: 'p2.xhtml' },
    ]);

    expect(labels(contents)).toEqual([
      'Part One',
      'Chapter One',
      'Chapter Two',
      'A Scene',
      'Part Two',
    ]);
    expect(shape(contents)).toEqual([
      '0 0 link',
      '0.0 1 link',
      '0.1 1 link',
      '0.1.0 2 link',
      '1 0 link',
    ]);
  });

  it('treats a leaf the same whether its subitems are null or absent', () => {
    const asNull = flowContents([{ label: 'Chapter One', href: 'ch1.xhtml', subitems: null }]);

    expect(shape(asNull)).toEqual(
      shape(flowContents([{ label: 'Chapter One', href: 'ch1.xhtml' }])),
    );
  });

  it('keys every entry by its place in the tree, so two entries named alike differ', () => {
    const contents = flowContents([
      { label: 'Notes', href: 'a.xhtml' },
      { label: 'Notes', href: 'b.xhtml' },
    ]);

    expect(listed(contents).map((entry) => entry.key)).toEqual(['0', '1']);
  });
});

describe('currentEntryKey', () => {
  it('marks the entry the book reports by identity, not by the label it shares', () => {
    const first: TocItem = { label: 'Notes', href: 'a.xhtml' };
    const second: TocItem = { label: 'Notes', href: 'b.xhtml' };
    const contents = flowContents([first, second]);

    expect(currentEntryKey(contents, second)).toBe('1');
    expect(currentEntryKey(contents, first)).toBe('0');
  });

  it('marks the entry the book reports even when a copy of it is listed too', () => {
    const reported: TocItem = { label: 'Chapter One', href: 'ch1.xhtml' };
    const contents = flowContents([{ label: 'Chapter One', href: 'ch1.xhtml' }, reported]);

    expect(currentEntryKey(contents, reported)).toBe('1');
  });

  it('marks nothing while the book has reported no entry', () => {
    const contents = flowContents([{ label: 'Chapter One', href: 'ch1.xhtml' }]);

    expect(currentEntryKey(contents, null)).toBeNull();
    expect(currentEntryKey(contents, undefined)).toBeNull();
  });

  it('marks nothing when the reported entry was dropped from the list', () => {
    const nameless: TocItem = {};
    const contents = flowContents([{ label: 'Chapter One', href: 'ch1.xhtml' }, nameless]);

    expect(currentEntryKey(contents, nameless)).toBeNull();
  });

  it('marks nothing in a book that has no contents to mark', () => {
    expect(currentEntryKey({ kind: 'absent' }, { label: 'Chapter One' })).toBeNull();
  });
});

describe('entryLabel', () => {
  it('says an entry is unnamed rather than showing an empty row', () => {
    const [entry] = listed(flowContents([{ href: 'ch1.xhtml' }]));

    expect(entry).toBeDefined();
    if (entry === undefined) return;
    expect(entryLabel(entry)).toBe(UNNAMED_ENTRY_LABEL);
  });

  it('shows the label of an entry that has one', () => {
    const [entry] = listed(flowContents([{ label: 'Chapter One', href: 'ch1.xhtml' }]));

    expect(entry).toBeDefined();
    if (entry === undefined) return;
    expect(entryLabel(entry)).toBe('Chapter One');
  });
});

describe('indentDepth', () => {
  it('indents an entry by its depth in the tree', () => {
    expect(indentDepth(0)).toBe(0);
    expect(indentDepth(2)).toBe(2);
  });

  it('caps the indent of an entry nested deeper than the panel is wide', () => {
    expect(indentDepth(MAX_INDENT_DEPTH + 7)).toBe(MAX_INDENT_DEPTH);
  });

  it('indents nothing for a depth that is not a whole count', () => {
    expect(indentDepth(-1)).toBe(0);
    expect(indentDepth(Number.NaN)).toBe(0);
  });
});
