type Variant = {
  readonly label: string;
  readonly href: string;
  readonly within: string | null;
};

type Comparison = {
  readonly title: string;
  readonly variants: readonly Variant[];
};

function activeComparison(): Comparison | null {
  return null;
}

function isShowing(variant: Variant, pathname: string): boolean {
  if (variant.within === null) return pathname === variant.href;

  return pathname === variant.within || pathname.startsWith(`${variant.within}/`);
}

export { activeComparison, isShowing };
export type { Comparison, Variant };
