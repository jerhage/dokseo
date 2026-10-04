import type { DiagramBox, DiagramEdge, DiagramGroup, DiagramNode } from '$lib/components/diagram';

type DiagramSpec = {
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly DiagramNode[];
  readonly edges: readonly DiagramEdge[];
};

const LOOP_COLUMNS = [0, 130, 260] as const;

const LOOP_ROWS = [10, 110, 210] as const;

function loopBox(column: 0 | 1 | 2, row: 0 | 1 | 2, label: string, detail?: string): DiagramBox {
  return {
    kind: 'box',
    x: LOOP_COLUMNS[column],
    y: LOOP_ROWS[row],
    width: 100,
    height: 48,
    label,
    ...(detail === undefined ? {} : { detail }),
  };
}

const crop = loopBox(0, 0, 'Crop', '224 × 224');
const encoder = { ...loopBox(1, 0, 'Encoder', 'once per crop'), tone: 'primary' } as const;
const features = loopBox(2, 0, 'Features', '197 × 768');
const prefix = loopBox(1, 1, 'Tokens so far', '[CLS] 今 日');
const decoder = { ...loopBox(2, 1, 'Decoder', 'once per token'), tone: 'primary' } as const;
const scores = loopBox(2, 2, 'Scores', '6144 logits');
const pick = { ...loopBox(1, 2, 'Highest score', 'next token'), tone: 'accent' } as const;
const text = loopBox(0, 2, 'Text', 'at [SEP]');

const ENCODER_DECODER_LOOP: DiagramSpec = {
  label:
    'The crop goes through the encoder once to become image features. The decoder takes the features and the tokens so far, scores every token in the vocabulary, the highest score is appended to the tokens, and the loop repeats until the end token, when the tokens become text.',
  width: 360,
  height: 268,
  nodes: [crop, encoder, features, prefix, decoder, scores, pick, text],
  edges: [
    { from: crop, to: encoder },
    { from: encoder, to: features },
    { from: features, to: decoder },
    { from: prefix, to: decoder },
    { from: decoder, to: scores },
    { from: scores, to: pick },
    { from: pick, to: prefix, label: 'append' },
    { from: pick, to: text },
  ],
};

const PIPELINE_ROWS = [34, 104, 174, 244, 314] as const;

function pipelineBox(
  column: 0 | 1,
  row: 0 | 1 | 2 | 3 | 4,
  label: string,
  detail: string,
): DiagramBox {
  return {
    kind: 'box',
    x: column === 0 ? 10 : 210,
    y: PIPELINE_ROWS[row],
    width: 140,
    height: 44,
    label,
    detail,
  };
}

const pageGroup: DiagramGroup = {
  kind: 'group',
  x: 0,
  y: 0,
  width: 160,
  height: 368,
  label: 'Page',
};

const workerGroup: DiagramGroup = {
  kind: 'group',
  x: 200,
  y: 140,
  width: 160,
  height: 228,
  label: 'Worker',
  tone: 'primary',
};

const selection = pipelineBox(0, 0, 'Selection', 'screen pixels');
const region = pipelineBox(0, 1, 'ImageRegion', 'index and rect');
const prepared = pipelineBox(0, 2, 'Crop, cap, gray', 'ImageBitmap');
const processor = pipelineBox(1, 2, 'Processor', '224 × 224 tensor');
const model = { ...pipelineBox(1, 3, 'Encoder, decoder', 'greedy loop'), tone: 'primary' } as const;
const reading = pipelineBox(1, 4, 'Text', 'spaces removed');
const capture = { ...pipelineBox(0, 4, 'Capture', 'IndexedDB'), tone: 'accent' } as const;

const CAPTURE_PIPELINE: DiagramSpec = {
  label:
    'In the page, a selection in screen pixels becomes an ImageRegion, which is cropped, capped and turned gray. The bitmap is posted to the worker, where the processor makes a 224 by 224 tensor, the encoder and decoder read it, and the text comes back to the page to be saved as a capture in IndexedDB.',
  width: 360,
  height: 368,
  nodes: [pageGroup, workerGroup, selection, region, prepared, processor, model, reading, capture],
  edges: [
    { from: selection, to: region },
    { from: region, to: prepared },
    { from: prepared, to: processor, label: 'post' },
    { from: processor, to: model },
    { from: model, to: reading },
    { from: reading, to: capture, label: 'reply' },
  ],
};

export { CAPTURE_PIPELINE, ENCODER_DECODER_LOOP };
export type { DiagramSpec };
