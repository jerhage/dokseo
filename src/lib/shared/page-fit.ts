type PageFit = 'height' | 'width';

const PAGE_FITS: readonly PageFit[] = ['height', 'width'];

function isPageFit(value: unknown): value is PageFit {
  return PAGE_FITS.some((fit) => fit === value);
}

export { isPageFit };
export type { PageFit };
