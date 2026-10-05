import type { DiagramBox, DiagramGroup, DiagramTone } from '$lib/ui/components/diagram';
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

function group(y: number, height: number, label: string, tone: DiagramTone): DiagramGroup {
  return { kind: 'group', x: 0, y, width: 360, height, label, tone };
}

const sourceGroup = group(0, 196, 'Source modules', 'neutral');
const libraryPage = box(8, 32, 100, 'library page', 'entry', 'primary');
const readerPage = box(128, 32, 100, 'reader page', 'entry', 'primary');
const button = box(60, 132, 100, 'Button', 'both pages');
const scrubber = box(176, 132, 88, 'PageBar', 'reader only');
const pdfAdapter = box(272, 132, 80, 'pdf adapter', 'dynamic', 'accent');
const chunkGroup = group(232, 116, 'Output chunks', 'primary');
const libraryChunk = box(8, 280, 64, 'library', 'chunk');
const sharedChunk = box(80, 280, 80, 'shared', 'chunk');
const readerChunk = box(176, 280, 88, 'reader', 'chunk');
const pdfChunk = box(272, 280, 80, 'pdf', 'on demand', 'accent');

const MODULES_TO_CHUNKS: DiagramSpec = {
  label:
    'Two route entries, the library page and the reader page, and a pdf adapter reached only through import(). A Button component is imported by both pages, a PageBar component only by the reader page. The bundler writes a chunk for each entry, the chunk of the reader page also holding PageBar, a shared chunk for Button because two entries use it, and a separate chunk for the pdf adapter that the browser fetches only when the import() runs.',
  width: 360,
  height: 348,
  nodes: [
    sourceGroup,
    chunkGroup,
    libraryPage,
    readerPage,
    pdfAdapter,
    button,
    scrubber,
    libraryChunk,
    readerChunk,
    sharedChunk,
    pdfChunk,
  ],
  edges: [
    { from: libraryPage, to: button },
    { from: readerPage, to: button },
    { from: readerPage, to: scrubber },
    { from: readerPage, to: pdfAdapter, label: 'import()' },
    { from: libraryPage, to: libraryChunk },
    { from: button, to: sharedChunk },
    { from: scrubber, to: readerChunk },
    { from: pdfAdapter, to: pdfChunk },
  ],
};

const entryModule = box(0, 0, 360, 'entry.js', "import { add } from './math.js'", 'primary');
const mathGroup = group(96, 112, 'math.js', 'neutral');
const addExport = box(12, 140, 104, 'add', 'imported: kept', 'primary');
const multiplyExport = box(128, 140, 104, 'multiply', 'unused: dropped');
const topLevel = box(244, 140, 104, 'top level', 'an effect: kept', 'accent');
const bundle = box(0, 252, 360, 'Bundle', 'add, the call to it, and the effect', 'primary');

const TREE_SHAKING: DiagramSpec = {
  label:
    'entry.js imports add from math.js. math.js exports add and multiply and also runs a statement at its top level that has an effect. The bundler follows the import from the entry and keeps add, drops multiply because nothing imports it, and keeps the top-level statement because running the module has that effect. The bundle holds add, the call to it and the effect.',
  width: 360,
  height: 304,
  nodes: [mathGroup, entryModule, addExport, multiplyExport, topLevel, bundle],
  edges: [
    { from: entryModule, to: addExport, label: 'import' },
    { from: addExport, to: bundle },
    { from: topLevel, to: bundle },
  ],
};

export { MODULES_TO_CHUNKS, TREE_SHAKING };
