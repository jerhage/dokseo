export type WeightsPrecision = 'fp32' | 'q8';

const PRECISION_SUFFIX: Record<WeightsPrecision, string> = {
  fp32: '',
  q8: '_quantized',
};

export type EncoderDecoderPrecision = {
  readonly encoder: WeightsPrecision;
  readonly decoder: WeightsPrecision;
};

export const QUANTIZED_THROUGHOUT: EncoderDecoderPrecision = { encoder: 'q8', decoder: 'q8' };

export const QUANTIZED_ENCODER_ONLY: EncoderDecoderPrecision = { encoder: 'q8', decoder: 'fp32' };

export function weightsFile(part: string, precision: WeightsPrecision): string {
  return `onnx/${part}${PRECISION_SUFFIX[precision]}.onnx`;
}

export function encoderDecoderWeights(precision: EncoderDecoderPrecision): readonly string[] {
  return [
    weightsFile('encoder_model', precision.encoder),
    weightsFile('decoder_model_merged', precision.decoder),
  ];
}

export const SINGLE_GRAPH_FILE = 'inference';

export const SINGLE_GRAPH_WEIGHTS: readonly string[] = [`${SINGLE_GRAPH_FILE}.onnx`];

export function weightsAmong(
  urls: readonly string[],
  needed: readonly string[],
): readonly string[] {
  const paths = urls.map((url) => url.split(/[?#]/)[0] ?? '');
  return needed.filter((one) => paths.some((path) => path.endsWith(`/${one}`)));
}
