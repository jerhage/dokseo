export type WeightsPrecision = 'fp32' | 'q8';

const PRECISION_SUFFIX: Record<WeightsPrecision, string> = {
  fp32: '',
  q8: '_quantized',
};

export const ENCODER_PRECISION: WeightsPrecision = 'q8';

export const DECODER_PRECISION: WeightsPrecision = 'fp32';

export function weightsFile(part: string, precision: WeightsPrecision): string {
  return `onnx/${part}${PRECISION_SUFFIX[precision]}.onnx`;
}

export const REQUIRED_WEIGHTS: readonly string[] = [
  weightsFile('encoder_model', ENCODER_PRECISION),
  weightsFile('decoder_model_merged', DECODER_PRECISION),
];

export function weightsAmong(urls: readonly string[]): readonly string[] {
  const paths = urls.map((url) => url.split(/[?#]/)[0] ?? '');
  return REQUIRED_WEIGHTS.filter((needed) => paths.some((path) => path.endsWith(`/${needed}`)));
}
