type StyleSource = {
  getPropertyValue(property: string): string;
};

function pixelLength(style: StyleSource, property: string): number {
  const parsed = Number.parseFloat(style.getPropertyValue(property));
  return Number.isFinite(parsed) ? parsed : 0;
}

export { pixelLength };
export type { StyleSource };
