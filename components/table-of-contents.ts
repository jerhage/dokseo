type ContentsLevel = 2 | 3;

type ContentsHeading = {
  readonly title: string;
  readonly level?: ContentsLevel;
};

type ContentsEntry = {
  readonly id: string;
  readonly href: string;
  readonly title: string;
  readonly level: ContentsLevel;
};

type HeadingPlace = {
  readonly id: string;
  readonly top: number;
};

type ReadingView = {
  readonly readingLine: number;
  readonly areaBottom: number;
  readonly scrolledToEnd: boolean;
};

type ScrollExtent = {
  readonly scrollTop: number;
  readonly clientHeight: number;
  readonly scrollHeight: number;
};

const FALLBACK_ANCHOR = 'section';

const READING_LINE_SHARE = 0.25;

const END_SLACK_PX = 1;

function anchorSlug(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
}

function unusedAnchor(base: string, used: ReadonlySet<string>): string {
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function contentsEntries(headings: readonly ContentsHeading[]): readonly ContentsEntry[] {
  const used = new Set<string>();
  return headings.map((heading) => {
    const id = unusedAnchor(anchorSlug(heading.title) || FALLBACK_ANCHOR, used);
    used.add(id);
    return { id, href: `#${id}`, title: heading.title, level: heading.level ?? 2 };
  });
}

function readingLine(areaTop: number, areaHeight: number): number {
  return areaTop + areaHeight * READING_LINE_SHARE;
}

function scrolledToEnd(extent: ScrollExtent): boolean {
  if (extent.scrollHeight <= extent.clientHeight) return false;
  return extent.scrollTop + extent.clientHeight >= extent.scrollHeight - END_SLACK_PX;
}

function currentHeading(headings: readonly HeadingPlace[], view: ReadingView): string | undefined {
  if (view.scrolledToEnd) {
    const shown = headings.findLast((heading) => heading.top < view.areaBottom);
    if (shown !== undefined) return shown.id;
  }
  const reached = headings.findLast((heading) => heading.top <= view.readingLine);
  return (reached ?? headings[0])?.id;
}

export {
  READING_LINE_SHARE,
  anchorSlug,
  contentsEntries,
  currentHeading,
  readingLine,
  scrolledToEnd,
  unusedAnchor,
};
export type {
  ContentsEntry,
  ContentsHeading,
  ContentsLevel,
  HeadingPlace,
  ReadingView,
  ScrollExtent,
};
