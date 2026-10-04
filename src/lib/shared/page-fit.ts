type PageFit = 'height' | 'width';

const PAGE_FITS: readonly PageFit[] = ['height', 'width'];

function isPageFit(value: unknown): value is PageFit {
  return PAGE_FITS.some((fit) => fit === value);
}

export { PAGE_FITS, isPageFit };
export type { PageFit };
