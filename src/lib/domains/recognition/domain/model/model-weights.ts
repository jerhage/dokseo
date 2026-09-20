type WeightsPrecision = 'fp32' | 'q8';

const PRECISION_SUFFIX: Record<WeightsPrecision, string> = {
  fp32: '',
  q8: '_quantized',
};

type EncoderDecoderPrecision = {
  readonly encoder: WeightsPrecision;
  readonly decoder: WeightsPrecision;
};

const QUANTIZED_THROUGHOUT: EncoderDecoderPrecision = { encoder: 'q8', decoder: 'q8' };

const QUANTIZED_ENCODER_ONLY: EncoderDecoderPrecision = { encoder: 'q8', decoder: 'fp32' };

function weightsFile(part: string, precision: WeightsPrecision): string {
  return `onnx/${part}${PRECISION_SUFFIX[precision]}.onnx`;
}

function encoderDecoderWeights(precision: EncoderDecoderPrecision): readonly string[] {
  return [
    weightsFile('encoder_model', precision.encoder),
    weightsFile('decoder_model_merged', precision.decoder),
  ];
}

const SINGLE_GRAPH_FILE = 'inference';

const SINGLE_GRAPH_WEIGHTS: readonly string[] = [`${SINGLE_GRAPH_FILE}.onnx`];

function weightsAmong(urls: readonly string[], needed: readonly string[]): readonly string[] {
  const paths = urls.map((url) => url.split(/[?#]/)[0] ?? '');
  return needed.filter((one) => paths.some((path) => path.endsWith(`/${one}`)));
}

export {
  QUANTIZED_THROUGHOUT,
  QUANTIZED_ENCODER_ONLY,
  weightsFile,
  encoderDecoderWeights,
  SINGLE_GRAPH_FILE,
  SINGLE_GRAPH_WEIGHTS,
  weightsAmong,
};
export type { WeightsPrecision, EncoderDecoderPrecision };
