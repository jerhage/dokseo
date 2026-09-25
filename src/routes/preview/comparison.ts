type Variant = {
  readonly label: string;
  readonly href: string;
  readonly within: string | null;
};

type Comparison = {
  readonly title: string;
  readonly variants: readonly Variant[];
};

const COMPARISON: Comparison = {
  title: 'Settings and storage',
  variants: [
    { label: 'Current', href: '/settings/storage', within: null },
    { label: 'A', href: '/preview/a/settings/storage', within: '/preview/a' },
    { label: 'B', href: '/preview/b/settings/storage', within: '/preview/b' },
  ],
};

function isShowing(variant: Variant, pathname: string): boolean {
  if (variant.within === null) return pathname === variant.href;

  return pathname === variant.within || pathname.startsWith(`${variant.within}/`);
}

export { COMPARISON, isShowing };
export type { Comparison, Variant };
