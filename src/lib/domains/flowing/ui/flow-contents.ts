import type { TocItem } from 'foliate-js/view.js';
import { reportedChapter } from './flow-progress';

type ContentsEntry =
  | {
      readonly kind: 'heading';
      readonly key: string;
      readonly depth: number;
      readonly label: string;
      readonly item: TocItem;
    }
  | {
      readonly kind: 'link';
      readonly key: string;
      readonly depth: number;
      readonly label: string | null;
      readonly href: string;
      readonly item: TocItem;
    };

type FlowContents =
  | { readonly kind: 'absent' }
  | { readonly kind: 'listed'; readonly entries: readonly ContentsEntry[] };

const NO_CONTENTS: FlowContents = { kind: 'absent' };

const CONTENTS_LABEL = 'Contents';

const NO_CONTENTS_LABEL = 'No contents';

const UNNAMED_ENTRY_LABEL = 'Unnamed section';

const MAX_INDENT_DEPTH = 4;

function reportedHref(href: string | null | undefined): string | null {
  if (href === undefined || href === null) return null;

  const target = href.trim();
  return target.length === 0 ? null : target;
}

function entryFor(item: TocItem, key: string, depth: number): ContentsEntry | null {
  const label = reportedChapter(item.label);
  const href = reportedHref(item.href);
  if (href !== null) return { kind: 'link', key, depth, label, href, item };

  return label === null ? null : { kind: 'heading', key, depth, label, item };
}

function gather(
  items: readonly TocItem[],
  depth: number,
  prefix: string,
  into: ContentsEntry[],
): void {
  items.forEach((item, index) => {
    const key = prefix === '' ? String(index) : `${prefix}.${index}`;
    const entry = entryFor(item, key, depth);
    if (entry !== null) into.push(entry);

    const subitems = item.subitems;
    if (subitems !== undefined && subitems !== null) gather(subitems, depth + 1, key, into);
  });
}

function flowContents(toc: readonly TocItem[] | null | undefined): FlowContents {
  if (toc === undefined || toc === null) return NO_CONTENTS;

  const entries: ContentsEntry[] = [];
  gather(toc, 0, '', entries);
  return entries.length === 0 ? NO_CONTENTS : { kind: 'listed', entries };
}

function currentEntryKey(
  contents: FlowContents,
  reported: TocItem | null | undefined,
): string | null {
  if (contents.kind === 'absent') return null;
  if (reported === undefined || reported === null) return null;

  const here = contents.entries.find((entry) => entry.item === reported);
  return here === undefined ? null : here.key;
}

function entryLabel(entry: ContentsEntry): string {
  return entry.label ?? UNNAMED_ENTRY_LABEL;
}

function indentDepth(depth: number): number {
  if (!Number.isFinite(depth) || depth < 0) return 0;

  return Math.min(Math.floor(depth), MAX_INDENT_DEPTH);
}

export {
  CONTENTS_LABEL,
  currentEntryKey,
  entryLabel,
  flowContents,
  indentDepth,
  MAX_INDENT_DEPTH,
  NO_CONTENTS,
  NO_CONTENTS_LABEL,
  UNNAMED_ENTRY_LABEL,
};
export type { ContentsEntry, FlowContents };
