const OCR_SECTIONS = {
  jobs: 'Finding text and reading it',
  manga: 'Why manga needs its own model',
  encoderDecoder: 'An encoder and a decoder',
  tokens: 'Model tokens',
  greedy: 'Greedy decoding',
  confidence: 'A confidence score from log probabilities',
  pipeline: 'From a selection to a stored capture',
  crop: 'The crop',
  port: 'The recognizer port and its adapters',
  engines: 'manga-ocr and PaddleOCR',
  runtime: 'transformers.js and ONNX Runtime Web',
  compute: 'CPU or GPU',
  worker: 'The OCR worker',
  download: 'Consent and the download',
  cache: 'The model cache and offline use',
  live: 'Try the real model',
  capture: 'What a capture stores',
} as const;

export { OCR_SECTIONS };
