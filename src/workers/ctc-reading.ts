type CtcLogits = {
  readonly dims: readonly [number, number, number];
  readonly data: Float32Array;
};

type CtcReading = {
  readonly text: string;
  readonly confidence: number | null;
};

const BLANK_INDEX = 0;

function ctcReading(logits: CtcLogits, labels: readonly string[]): CtcReading {
  const [, steps, classes] = logits.dims;
  const emitted: string[] = [];
  const scores: number[] = [];
  let previous = -1;

  for (let step = 0; step < steps; step += 1) {
    const row = logits.data.subarray(step * classes, (step + 1) * classes);

    let best = BLANK_INDEX;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (let index = 0; index < classes; index += 1) {
      const score = row[index] ?? Number.NEGATIVE_INFINITY;
      if (score > bestScore) {
        best = index;
        bestScore = score;
      }
    }

    if (best !== BLANK_INDEX && best !== previous) {
      emitted.push(labels[best] ?? '');
      scores.push(bestScore);
    }

    previous = best;
  }

  const confidence =
    scores.length === 0 ? null : scores.reduce((total, one) => total + one, 0) / scores.length;

  return { text: emitted.join(''), confidence };
}

function joinedReading(readings: readonly CtcReading[]): CtcReading {
  const said = readings.filter((reading) => reading.text.length > 0);
  if (said.length === 0) return { text: '', confidence: null };

  const measured = said.filter((reading) => reading.confidence !== null);
  const confidence =
    measured.length === 0
      ? null
      : measured.reduce((total, one) => total + (one.confidence ?? 0), 0) / measured.length;

  return { text: said.map((reading) => reading.text).join('\n'), confidence };
}

export { ctcReading, joinedReading };
export type { CtcLogits, CtcReading };
