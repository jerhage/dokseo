import type { DiagramBox, DiagramGroup, DiagramTone } from '$lib/ui/components/diagram';
import type { DiagramSpec } from '../storage/storage-diagrams';

function box(
  x: number,
  y: number,
  width: number,
  label: string,
  detail: string,
  tone: DiagramTone = 'neutral',
): DiagramBox {
  return { kind: 'box', x, y, width, height: 52, label, detail, tone };
}

function group(x: number, y: number, width: number, height: number, label: string): DiagramGroup {
  return { kind: 'group', x, y, width, height, label };
}

const mainThread = group(0, 0, 360, 100, 'Main thread');
const pageScript = box(10, 36, 160, 'Page script', 'calls postMessage');
const rendering = box(190, 36, 160, 'DOM and rendering', 'updated by handlers');
const request = box(10, 140, 160, 'Request', 'a structured clone', 'accent');
const reply = box(190, 140, 160, 'Reply', 'a structured clone', 'accent');
const workerThread = group(0, 250, 360, 100, 'Worker');
const workerScript = box(
  10,
  286,
  340,
  'Worker script',
  'its own global and event loop, no DOM',
  'primary',
);

const MESSAGE_CHANNEL: DiagramSpec = {
  label:
    'The page script on the main thread posts a request, which is copied by the structured clone algorithm and arrives as a message event in the worker script on the worker thread. The worker script has its own global and event loop and no DOM. Its reply is copied the same way back to the main thread, where a message handler updates the DOM.',
  width: 360,
  height: 350,
  nodes: [mainThread, workerThread, pageScript, rendering, request, reply, workerScript],
  edges: [
    { from: pageScript, to: request, label: 'postMessage' },
    { from: request, to: workerScript, label: 'onmessage' },
    { from: workerScript, to: reply, label: 'postMessage' },
    { from: reply, to: rendering, label: 'onmessage' },
  ],
};

const cloneSide = group(0, 0, 170, 240, 'Clone');
const clonedFrom = box(10, 36, 150, "Page's buffer", '64 MB, still usable');
const clonedTo = box(10, 176, 150, "Worker's buffer", '64 MB, a new copy');
const transferSide = group(190, 0, 170, 240, 'Transfer');
const movedFrom = box(200, 36, 150, "Page's buffer", '0 bytes, detached', 'accent');
const movedTo = box(200, 176, 150, "Worker's buffer", 'the same 64 MB', 'primary');

const CLONE_OR_TRANSFER: DiagramSpec = {
  label:
    "Clone: the page's 64 MB buffer stays usable and the worker receives a new copy of every byte. Transfer: the page's buffer is detached and reads 0 bytes, and the worker receives the same 64 MB without a copy.",
  width: 360,
  height: 240,
  nodes: [cloneSide, transferSide, clonedFrom, clonedTo, movedFrom, movedTo],
  edges: [
    { from: clonedFrom, to: clonedTo, label: 'copy' },
    { from: movedFrom, to: movedTo, label: 'move' },
  ],
};

const page = box(0, 0, 360, "Dokseo's page", 'the main thread', 'primary');
const ocrWorker = box(0, 112, 112, 'OCR worker', 'crops in, text out');
const writerWorker = box(124, 112, 112, 'OPFS writer', 'Blobs in');
const pdfWorker = box(248, 112, 112, 'pdf.js worker', 'pdf.js messages');
const runtimeThreads = box(0, 224, 112, 'ORT threads', 'numThreads - 1');

const DOKSEO_WORKERS: DiagramSpec = {
  label:
    "Dokseo's page on the main thread starts an OCR worker that receives crops and returns text, an OPFS writer that receives Blobs, and pdf.js's own worker for PDF parsing. Inside the OCR worker, ONNX Runtime starts numThreads minus one more threads.",
  width: 360,
  height: 276,
  nodes: [page, ocrWorker, writerWorker, pdfWorker, runtimeThreads],
  edges: [
    { from: page, to: ocrWorker },
    { from: page, to: writerWorker },
    { from: page, to: pdfWorker },
    { from: ocrWorker, to: runtimeThreads },
  ],
};

export { CLONE_OR_TRANSFER, DOKSEO_WORKERS, MESSAGE_CHANNEL };
