import type { SourceSnippet } from '../ocr/ocr-snippets';

const PART_TO_STRING: SourceSnippet = {
  label: 'foliate-js, epubcfi.js: one step of a CFI path',
  file: 'node_modules/foliate-js/epubcfi.js',
  code: `const partToString = ({ index, id, offset, temporal, spatial, text, side }) => {
    const param = side ? \`;s=\${side}\` : ''
    return \`/\${index}\`
        + (id ? \`[\${escapeCFI(id)}\${param}]\` : '')
        // "CFI expressions [..] SHOULD include an explicit character offset"
        + (offset != null && index % 2 ? \`:\${offset}\` : '')`,
};

const TEXT_EDGES: SourceSnippet = {
  label: 'src/lib/domains/flowing/ui/flow-range-edges.ts, excerpt',
  file: 'src/lib/domains/flowing/ui/flow-range-edges.ts',
  code: `function textEdges<N extends EdgeNode<N>>(range: BoundedRange<N>): TextEdges<N> | null {
  const start = textStart(range.startContainer, range.startOffset);
  const end = textEnd(range.endContainer, range.endOffset);
  if (start === null || end === null) return null;

  return { start, end };
}`,
};

const LIFTED_RANGE: SourceSnippet = {
  label: 'src/lib/domains/flowing/ui/flow-passage.ts, selectedPassage excerpt',
  file: 'src/lib/domains/flowing/ui/flow-passage.ts',
  code: `const lifted = rangeOnText(doc, range) ?? quoteRange(doc, quote);
if (lifted === null) return null;

return {
  cfi: cfis.getCFI(index, lifted),`,
};

const COLLAPSED_CFI: SourceSnippet = {
  label: 'src/lib/domains/flowing/ui/flow-cfi.ts, excerpt',
  file: 'src/lib/domains/flowing/ui/flow-cfi.ts',
  code: `function collapsedCfi(cfi: string): boolean {
  const inner = CFI_WRAPPER.exec(cfi.trim())?.[1];
  if (inner === undefined) return false;

  const parts = rangeParts(inner);
  if (parts.length !== 3) return false;

  return parts[1] === parts[2];
}`,
};

const STORED_CFI_FIRST: SourceSnippet = {
  label: 'src/lib/domains/flowing/ui/flow-surface.ts, goToPassage excerpt',
  file: 'src/lib/domains/flowing/ui/flow-surface.ts',
  code: `const stored = await navigate(view, spine, passage.cfi);
if (reached(stored) && !collapsedCfi(passage.cfi)) return arrivedAtTheCfi(passage.cfi);
if (passage.quote === null) return THE_PASSAGE_IS_LOST;

const fresh = await find(passage.quote);`,
};

const TRIPLE_CLICK_SNIPPETS: readonly SourceSnippet[] = [
  PART_TO_STRING,
  TEXT_EDGES,
  LIFTED_RANGE,
  COLLAPSED_CFI,
  STORED_CFI_FIRST,
];

export {
  COLLAPSED_CFI,
  LIFTED_RANGE,
  PART_TO_STRING,
  STORED_CFI_FIRST,
  TEXT_EDGES,
  TRIPLE_CLICK_SNIPPETS,
};
