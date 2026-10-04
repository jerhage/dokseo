import { describe, expect, it } from 'vitest';
import { pairingScene, viewportOf } from './pairing-playground';
import type { PairingInput } from './pairing-playground';

const COMPACT = 700;

const BASE: PairingInput = {
  screen: 'phone',
  orientation: 'portrait',
  choice: 'auto',
  direction: 'rtl',
  layout: 'paged',
  compactWidth: COMPACT,
};

function indices(input: PairingInput): readonly (readonly number[])[] {
  return pairingScene(input).groups.map((group) => group.map((sheet) => sheet.index));
}

describe('viewportOf', () => {
  it('puts the long side across in landscape and down in portrait', () => {
    expect(viewportOf('phone', 'portrait')).toEqual({ width: 390, height: 844 });
    expect(viewportOf('phone', 'landscape')).toEqual({ width: 844, height: 390 });
  });
});

describe('pairingScene', () => {
  it('shows one page at a time on a phone held upright under automatic pairing', () => {
    const scene = pairingScene(BASE);

    expect(scene.screenWidth).toBe('narrow');
    expect(scene.pairing).toBe('single');
    expect(indices(BASE)).toHaveLength(9);
  });

  it('pairs after the cover once the phone turns wider than the compact breakpoint', () => {
    const turned = { ...BASE, orientation: 'landscape' } as const;

    expect(pairingScene(turned).pairing).toBe('double-after-cover');
    expect(indices(turned)).toEqual([[0], [1, 2], [3], [4], [5, 6], [7, 8]]);
  });

  it('keeps the wide spread alone and pairs from the first page under two pages side by side', () => {
    const doubled = { ...BASE, choice: 'double' } as const;

    expect(indices(doubled)).toEqual([[0, 1], [2, 3], [4], [5, 6], [7, 8]]);
  });

  it('follows a chosen pairing whatever the screen', () => {
    expect(pairingScene({ ...BASE, screen: 'laptop', choice: 'single' }).pairing).toBe('single');
  });

  it('shows a strip one image at a time, left to right, whatever is chosen', () => {
    const strip = pairingScene({
      ...BASE,
      screen: 'laptop',
      choice: 'double',
      layout: 'continuous',
    });

    expect(strip.pairing).toBe('single');
    expect(strip.direction).toBe('ltr');
  });

  it('marks the spread page as wide', () => {
    const wide = pairingScene(BASE)
      .groups.flat()
      .filter((sheet) => sheet.wide);

    expect(wide.map((sheet) => sheet.index)).toEqual([4]);
  });

  it('counts a screen as wide when the compact breakpoint is not measured yet', () => {
    expect(pairingScene({ ...BASE, compactWidth: 0 }).screenWidth).toBe('wide');
  });
});
