function remPixels(length: string, rootFontPixels: number): number | null {
  const found = /^\s*(\d*\.?\d+)rem\s*$/u.exec(length);
  if (found === null || !Number.isFinite(rootFontPixels)) return null;
  return Number(found[1]) * rootFontPixels;
}

export { remPixels };
