type PointerPrecision = 'coarse' | 'fine';

function anyPointer(precision: PointerPrecision): boolean {
  if (typeof matchMedia !== 'function') return false;

  return matchMedia(`(any-pointer: ${precision})`).matches;
}

export { anyPointer };
export type { PointerPrecision };
