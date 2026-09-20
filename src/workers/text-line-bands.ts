export type TextBand = {
  readonly top: number;
  readonly bottom: number;
};

const MIN_CONTRAST = 12;

const INK_SHARE = 0.06;

const MIN_BAND_HEIGHT = 4;

const MIN_BAND_SHARE = 0.02;

const MAX_BANDS = 12;

export function inkPerRow(
  luma: ArrayLike<number>,
  width: number,
  height: number,
): readonly number[] {
  const counts: number[] = Array.from({ length: Math.max(0, height) }, () => 0);
  if (width <= 0 || height <= 0) return counts;

  let lowest = Number.POSITIVE_INFINITY;
  let highest = Number.NEGATIVE_INFINITY;
  let total = 0;
  for (let at = 0; at < width * height; at += 1) {
    const value = luma[at] ?? 0;
    if (value < lowest) lowest = value;
    if (value > highest) highest = value;
    total += value;
  }

  if (highest - lowest < MIN_CONTRAST) return counts;

  const threshold = (lowest + highest) / 2;
  const onLightGround = total / (width * height) >= threshold;

  for (let row = 0; row < height; row += 1) {
    let inked = 0;
    for (let column = 0; column < width; column += 1) {
      const value = luma[row * width + column] ?? 0;
      if (onLightGround ? value < threshold : value > threshold) inked += 1;
    }
    counts[row] = inked;
  }

  return counts;
}

export function bandsOfInk(counts: readonly number[]): readonly TextBand[] {
  const height = counts.length;
  const peak = counts.reduce((most, one) => Math.max(most, one), 0);
  if (peak === 0) return [];

  const onset = Math.max(1, Math.round(peak * INK_SHARE));
  const shortest = Math.max(MIN_BAND_HEIGHT, Math.round(height * MIN_BAND_SHARE));

  const bands: TextBand[] = [];
  let top = -1;
  for (let row = 0; row < height; row += 1) {
    const inked = (counts[row] ?? 0) >= onset;
    if (inked && top < 0) top = row;
    if (!inked && top >= 0) {
      if (row - top >= shortest) bands.push({ top, bottom: row });
      top = -1;
    }
  }

  if (top >= 0 && height - top >= shortest) bands.push({ top, bottom: height });
  return bands;
}

export function textLineBands(
  luma: ArrayLike<number>,
  width: number,
  height: number,
): readonly TextBand[] {
  const whole: readonly TextBand[] = [{ top: 0, bottom: height }];
  if (width <= 0 || height <= 0) return [];

  const bands = bandsOfInk(inkPerRow(luma, width, height));
  if (bands.length === 0 || bands.length > MAX_BANDS) return whole;

  return bands;
}
