type TokenCandidate = {
  readonly id: number;
  readonly piece: string;
  readonly logProb: number;
};

type DecodeStep = {
  readonly prefixLength: number;
  readonly candidates: readonly [TokenCandidate, ...TokenCandidate[]];
};

type DecodeRun = {
  readonly crop: { readonly width: number; readonly height: number };
  readonly pixelValueDims: readonly number[];
  readonly pixelValueRange: { readonly min: number; readonly max: number };
  readonly encoderOutputDims: readonly number[];
  readonly encoderMs: number;
  readonly decoderMs: number;
  readonly vocabularySize: number;
  readonly startToken: number;
  readonly endToken: number;
  readonly steps: readonly DecodeStep[];
  readonly decoded: string;
};

type SequenceScore = {
  readonly logProb: number;
  readonly meanLogProb: number;
  readonly confidence: number;
  readonly weakest: TokenCandidate;
};

const NO_STEPS = 'A decode run with no steps has no score';

function probabilityOf(logProb: number): number {
  return Math.exp(logProb);
}

function chosenToken(step: DecodeStep): TokenCandidate {
  return step.candidates[0];
}

function tokensAfter(run: DecodeRun, steps: number): readonly number[] {
  return [run.startToken, ...run.steps.slice(0, steps).map((step) => chosenToken(step).id)];
}

function textAfter(run: DecodeRun, steps: number): string {
  return run.steps
    .slice(0, steps)
    .map(chosenToken)
    .filter((token) => token.id !== run.startToken && token.id !== run.endToken)
    .map((token) => token.piece)
    .join('');
}

function sequenceScore(steps: readonly DecodeStep[]): SequenceScore {
  const chosen = steps.map(chosenToken);
  const first = chosen[0];
  if (first === undefined) throw new Error(NO_STEPS);

  const logProb = chosen.reduce((total, token) => total + token.logProb, 0);
  const meanLogProb = logProb / chosen.length;
  const weakest = chosen.reduce(
    (lowest, token) => (token.logProb < lowest.logProb ? token : lowest),
    first,
  );

  return { logProb, meanLogProb, confidence: probabilityOf(meanLogProb), weakest };
}

export { chosenToken, probabilityOf, sequenceScore, textAfter, tokensAfter };
export type { DecodeRun, DecodeStep, SequenceScore, TokenCandidate };
