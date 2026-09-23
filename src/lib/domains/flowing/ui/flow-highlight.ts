import type { Anchor } from '$lib/shared/anchor';

type HighlightChange = {
  readonly added: readonly string[];
  readonly removed: readonly string[];
};

const PASSAGE_HIGHLIGHT_COLOUR = '#e3c34d';

const NO_PASSAGES: readonly string[] = [];

const NO_ANCHORS: readonly Anchor[] = [];

function passageCfis(anchors: readonly Anchor[]): readonly string[] {
  const wanted = new Set<string>();
  for (const anchor of anchors) {
    if (anchor.kind !== 'text') continue;
    if (anchor.cfi.length === 0) continue;

    wanted.add(anchor.cfi);
  }

  return [...wanted];
}

function highlightChange(drawn: ReadonlySet<string>, asked: readonly string[]): HighlightChange {
  const wanted = new Set(asked);

  return {
    added: [...wanted].filter((cfi) => !drawn.has(cfi)),
    removed: [...drawn].filter((cfi) => !wanted.has(cfi)),
  };
}

export { NO_ANCHORS, NO_PASSAGES, PASSAGE_HIGHLIGHT_COLOUR, highlightChange, passageCfis };
export type { HighlightChange };
