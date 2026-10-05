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

const capturedText = box(0, 0, 360, 'capture.text', 'stored by OCR, as today');
const analyzer = box(
  0,
  96,
  360,
  'WordAnalyzer',
  'Word[]: surface, phoneticReading, base form',
  'primary',
);
const readingLine = box(0, 192, 170, 'Reading line', 'ruby, optional', 'accent');
const dictionary = box(190, 192, 170, 'Dictionary', 'looked up by base form', 'primary');
const popover = box(190, 288, 170, 'Popover', 'entries, on tap or click', 'accent');

const WORD_PIPELINE: DiagramSpec = {
  label:
    'The text of a capture, stored by OCR as today, goes to the WordAnalyzer through the analyze-text use case. The analyzer returns Words, each with a surface form, a phoneticReading and a base form. The readings feed an optional reading line drawn as ruby. The base forms are looked up in the Dictionary, whose entries appear in a popover when the reader taps or clicks a word.',
  width: 360,
  height: 340,
  nodes: [capturedText, analyzer, readingLine, dictionary, popover],
  edges: [
    { from: capturedText, to: analyzer, label: 'analyze-text' },
    { from: analyzer, to: readingLine },
    { from: analyzer, to: dictionary },
    { from: dictionary, to: popover },
  ],
};

const pageGroup = group(0, 116, 'Page', 'neutral');
const card = box(8, 40, 160, 'Capture card', 'plain text, popover');
const viewModel = box(192, 40, 160, 'Panel view model', 'Word[] in memory', 'primary');
const workerGroup = group(168, 116, 'Worker', 'primary');
const wasmAnalyzer = box(100, 208, 160, 'Analyzer', 'Lindera WASM', 'primary');
const storageGroup = group(336, 116, 'Storage', 'accent');
const binaryStore = box(8, 376, 160, 'OPFS or Cache API', 'analyzer dictionary');
const indexStore = box(192, 376, 160, 'IndexedDB', 'dictionary index');

const WHERE_IT_RUNS: DiagramSpec = {
  label:
    'On the page, the capture card shows the plain text and the popover, and the panel view model keeps the analyzed Words in memory. The view model sends text to a worker, where the Lindera analyzer runs as WebAssembly. The analyzer reads its dictionary files from the origin private file system or the Cache API. Dictionary entries are read from an index in a new IndexedDB database. Nothing derived from the text is written to storage.',
  width: 360,
  height: 452,
  nodes: [
    pageGroup,
    workerGroup,
    storageGroup,
    card,
    viewModel,
    wasmAnalyzer,
    binaryStore,
    indexStore,
  ],
  edges: [
    { from: card, to: viewModel },
    { from: viewModel, to: wasmAnalyzer, label: 'text' },
    { from: wasmAnalyzer, to: binaryStore, label: 'loads' },
    { from: viewModel, to: indexStore, label: 'base form' },
  ],
};

export { WHERE_IT_RUNS, WORD_PIPELINE };
