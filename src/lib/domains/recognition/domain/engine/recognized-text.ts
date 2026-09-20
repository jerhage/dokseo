export type RecognizedText = {
  readonly text: string;
  readonly confidence: number | null;
};

export function recognizedText(text: string, confidence: number | null = null): RecognizedText {
  return { text: text.trim(), confidence };
}

export function hasNoText(recognized: RecognizedText): boolean {
  return recognized.text.length === 0;
}
