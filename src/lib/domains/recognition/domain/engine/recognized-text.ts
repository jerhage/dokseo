type RecognizedText = {
  readonly text: string;
  readonly confidence: number | null;
};

function recognizedText(text: string, confidence: number | null = null): RecognizedText {
  return { text: text.trim(), confidence };
}

function hasNoText(recognized: RecognizedText): boolean {
  return recognized.text.length === 0;
}

export { recognizedText, hasNoText };
export type { RecognizedText };
