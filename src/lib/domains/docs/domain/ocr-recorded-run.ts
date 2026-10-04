import type { DecodeRun, DecodeStep, TokenCandidate } from './ocr-decoding';

type Candidate = readonly [id: number, piece: string, logProb: number];

function candidate([id, piece, logProb]: Candidate): TokenCandidate {
  return { id, piece, logProb };
}

function step(
  prefixLength: number,
  [first, ...rest]: readonly [Candidate, ...Candidate[]],
): DecodeStep {
  return { prefixLength, candidates: [candidate(first), ...rest.map(candidate)] };
}

const RECORDED_BUBBLE_RUN: DecodeRun = {
  crop: { width: 279, height: 384 },
  pixelValueDims: [1, 3, 224, 224],
  pixelValueRange: { min: -0.8745, max: 1 },
  encoderOutputDims: [1, 197, 768],
  encoderMs: 291,
  decoderMs: 144,
  vocabularySize: 6144,
  startToken: 2,
  endToken: 3,
  steps: [
    step(1, [
      [2, '[CLS]', 0],
      [933, 'ん', -21.2398],
      [860, 'お', -23.1455],
    ]),
    step(2, [
      [1109, '今', 0],
      [838, '「', -13.6395],
      [828, '、', -14.7483],
    ]),
    step(3, [
      [2719, '日', 0],
      [3693, '田', -11.2587],
      [1708, '回', -11.6562],
    ]),
    step(4, [
      [897, 'は', 0],
      [909, 'ほ', -13.1889],
      [893, 'に', -15.3405],
    ]),
    step(5, [
      [1847, '天', 0],
      [1850, '夭', -12.0499],
      [1846, '大', -14.0245],
    ]),
    step(6, [
      [3139, '気', 0],
      [3140, '氣', -15.93],
      [2000, '家', -16.254],
    ]),
    step(7, [
      [862, 'が', 0],
      [904, 'ぶ', -11.3397],
      [901, 'び', -12.1133],
    ]),
    step(8, [
      [854, 'い', -0.0008],
      [853, 'ぃ', -7.1193],
      [903, 'ふ', -15.0148],
    ]),
    step(9, [
      [854, 'い', -0.0001],
      [853, 'ぃ', -9.434],
      [881, 'た', -13.5007],
    ]),
    step(10, [
      [895, 'ね', -0.0001],
      [929, 'わ', -9.5841],
      [892, 'な', -11.2277],
    ]),
    step(11, [
      [3, '[SEP]', -0.0137],
      [829, '。', -4.6758],
      [828, '、', -6.0844],
    ]),
  ],
  decoded: '今 日 は 天 気 が い い ね',
};

export { RECORDED_BUBBLE_RUN };
