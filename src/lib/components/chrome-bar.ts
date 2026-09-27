import type { ClassList } from './classes';

type ChromeBarEdge = 'top' | 'bottom';

type ChromeBarElement = 'header' | 'footer';

type ChromeBarShape = {
  readonly element: ChromeBarElement;
  readonly classes: ClassList;
};

const CHROME_BAR_EDGES: Readonly<Record<ChromeBarEdge, ChromeBarShape>> = {
  top: { element: 'header', classes: ['chrome-bar-top'] },
  bottom: { element: 'footer', classes: ['chrome-bar-bottom'] },
};

export { CHROME_BAR_EDGES };
export type { ChromeBarEdge, ChromeBarElement, ChromeBarShape };
