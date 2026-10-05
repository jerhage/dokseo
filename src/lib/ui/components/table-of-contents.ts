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

const FALLBACK_ANCHOR = 'section';

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

export { anchorSlug, contentsEntries };
export type { ContentsEntry, ContentsHeading, ContentsLevel };
