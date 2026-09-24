import { match } from 'ts-pattern';

type PageSlot =
  | { readonly kind: 'page'; readonly page: number }
  | { readonly kind: 'gap'; readonly after: number };

type WindowShape =
  | { readonly kind: 'every-page' }
  | { readonly kind: 'gap-before-last' }
  | { readonly kind: 'gap-after-first' }
  | { readonly kind: 'gaps-around'; readonly from: number; readonly to: number };

function pages(from: number, to: number): readonly PageSlot[] {
  return Array.from({ length: Math.max(0, to - from + 1) }, (_, index) => ({
    kind: 'page',
    page: from + index,
  }));
}

function windowShape(current: number, total: number, siblings: number): WindowShape {
  if (total <= siblings * 2 + 5) return { kind: 'every-page' };
  const from = Math.max(current - siblings, 1);
  const to = Math.min(current + siblings, total);
  const gapBefore = from > 3;
  const gapAfter = to < total - 2;
  if (gapBefore && gapAfter) return { kind: 'gaps-around', from, to };
  return gapBefore ? { kind: 'gap-after-first' } : { kind: 'gap-before-last' };
}

function paginationWindow(current: number, total: number, siblings = 1): readonly PageSlot[] {
  if (total < 1) return [];
  const edge = siblings * 2 + 3;
  return match(windowShape(Math.round(current), total, siblings))
    .with({ kind: 'every-page' }, () => pages(1, total))
    .with({ kind: 'gap-before-last' }, (): readonly PageSlot[] => [
      ...pages(1, edge),
      { kind: 'gap', after: edge },
      { kind: 'page', page: total },
    ])
    .with({ kind: 'gap-after-first' }, (): readonly PageSlot[] => [
      { kind: 'page', page: 1 },
      { kind: 'gap', after: 1 },
      ...pages(total - edge + 1, total),
    ])
    .with({ kind: 'gaps-around' }, ({ from, to }): readonly PageSlot[] => [
      { kind: 'page', page: 1 },
      { kind: 'gap', after: 1 },
      ...pages(from, to),
      { kind: 'gap', after: to },
      { kind: 'page', page: total },
    ])
    .exhaustive();
}

export { paginationWindow };
export type { PageSlot };
