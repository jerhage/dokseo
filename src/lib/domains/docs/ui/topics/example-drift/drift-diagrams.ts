import type { DiagramBox, DiagramTone } from '$lib/ui/components/diagram';
import type { DiagramSpec } from '../storage/storage-diagrams';

const BOX_HEIGHT = 52;

function box(
  x: number,
  y: number,
  width: number,
  label: string,
  detail: string,
  tone: DiagramTone = 'neutral',
): DiagramBox {
  return { kind: 'box', x, y, width, height: BOX_HEIGHT, label, detail, tone };
}

const sourceFile = box(0, 0, 170, 'Source file', 'ja-ocr-text.ts');
const quoteList = box(190, 0, 170, 'Quote list', 'unicode-snippets.ts', 'primary');
const driftSpec = box(0, 124, 170, 'Drift spec', 'unicode-snippets.spec.ts', 'accent');
const docsPage = box(190, 124, 170, 'Docs page', 'DocsCode');
const verifyCi = box(0, 248, 360, 'deno task verify:ci', 'the unit project runs every spec');

const QUOTE_FLOW: DiagramSpec = {
  label:
    'A source file, ja-ocr-text.ts, and a quote list, unicode-snippets.ts. The docs page renders each quote from the list with DocsCode. The drift spec imports the same list, reads the source file, and checks that the file contains each quote. CI runs the spec through deno task verify:ci.',
  width: 360,
  height: 300,
  nodes: [sourceFile, quoteList, driftSpec, docsPage, verifyCi],
  edges: [
    { from: quoteList, to: docsPage, label: 'renders' },
    { from: sourceFile, to: driftSpec, label: 'read' },
    { from: quoteList, to: driftSpec, label: 'imported' },
    { from: driftSpec, to: verifyCi, label: 'runs' },
  ],
};

export { QUOTE_FLOW };
