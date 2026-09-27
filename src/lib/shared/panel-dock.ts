function isNarrow(width: number, breakpoint: number): boolean {
  return width > 0 && breakpoint > 0 && width < breakpoint;
}

function askedAfterCapture(narrow: boolean, asked: boolean | null): boolean | null {
  return narrow ? asked : true;
}

export { askedAfterCapture, isNarrow };
