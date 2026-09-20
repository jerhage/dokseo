export type DecoderLogits = {
  readonly dims: readonly [number, number, number];
  readonly data: Float32Array;
};

export function mostLikelyToken(logits: DecoderLogits): number {
  const [, positions, vocabulary] = logits.dims;
  const lastPosition = logits.data.subarray((positions - 1) * vocabulary, positions * vocabulary);

  let best = 0;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let token = 0; token < vocabulary; token += 1) {
    const score = lastPosition[token] ?? Number.NEGATIVE_INFINITY;
    if (score > bestScore) {
      best = token;
      bestScore = score;
    }
  }

  return best;
}
