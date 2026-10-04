type PixelSize = { readonly width: number; readonly height: number };

type Squash = { readonly across: number; readonly down: number };

const MANGA_OCR_INPUT: PixelSize = { width: 224, height: 224 };

function squashInto(prepared: PixelSize, modelInput: PixelSize): Squash {
  return {
    across: modelInput.width / prepared.width,
    down: modelInput.height / prepared.height,
  };
}

function sizeText(size: PixelSize): string {
  return `${size.width} × ${size.height}`;
}

function factorText(factor: number): string {
  return `× ${factor.toFixed(2)}`;
}

export { MANGA_OCR_INPUT, factorText, sizeText, squashInto };
export type { PixelSize, Squash };
