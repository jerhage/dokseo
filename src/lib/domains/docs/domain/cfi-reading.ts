import { match } from 'ts-pattern';

type StepPlace = 'package' | 'document';

type CfiPart =
  | {
      readonly kind: 'step';
      readonly text: string;
      readonly place: StepPlace;
      readonly depth: number;
      readonly index: number;
      readonly id: string | null;
    }
  | { readonly kind: 'indirection'; readonly text: string }
  | { readonly kind: 'offset'; readonly text: string; readonly at: number }
  | { readonly kind: 'range-start'; readonly text: string }
  | { readonly kind: 'range-end'; readonly text: string };

const CFI_WRAPPER = /^epubcfi\((.*)\)$/u;

const TOKEN = /\/(\d+)(?:\[([^\]]*)\])?|:(\d+)(?:\[[^\]]*\])?|!|,/uy;

const SPINE_INDEX = 6;

const BODY_INDEX = 4;

const ORDINALS = new Intl.PluralRules('en-US', { type: 'ordinal' });

const ORDINAL_SUFFIXES: Readonly<Record<Intl.LDMLPluralRule, string>> = {
  zero: 'th',
  one: 'st',
  two: 'nd',
  few: 'rd',
  many: 'th',
  other: 'th',
};

function ordinal(position: number): string {
  return `${position}${ORDINAL_SUFFIXES[ORDINALS.select(position)]}`;
}

function readCfi(cfi: string): readonly CfiPart[] | null {
  const inner = CFI_WRAPPER.exec(cfi.trim())?.[1];
  if (inner === undefined || inner === '') return null;

  const parts: CfiPart[] = [];
  let place: StepPlace = 'package';
  let depth = 0;
  let rangeDepth = 0;
  let commas = 0;
  const token = new RegExp(TOKEN);
  while (token.lastIndex < inner.length) {
    const found = token.exec(inner);
    if (found === null) return null;

    const [text, step, id, offset] = found;
    if (step !== undefined) {
      parts.push({ kind: 'step', text, place, depth, index: Number(step), id: id ?? null });
      depth += 1;
    } else if (offset !== undefined) {
      parts.push({ kind: 'offset', text, at: Number(offset) });
    } else if (text === '!') {
      parts.push({ kind: 'indirection', text });
      place = 'document';
      depth = 0;
    } else {
      commas += 1;
      if (commas === 1) rangeDepth = depth;
      depth = rangeDepth;
      parts.push(commas === 1 ? { kind: 'range-start', text } : { kind: 'range-end', text });
    }
  }
  return parts;
}

function assertion(id: string | null): string {
  return id === null ? '' : `, with the id assertion ${id}`;
}

function packageStepMeaning(depth: number, index: number, id: string | null): string {
  if (depth === 0) {
    const spine = index === SPINE_INDEX ? ': the spine' : '';
    return `the package's ${ordinal(index / 2)} child element${spine}`;
  }
  return `the ${ordinal(index / 2)} itemref in the spine${assertion(id)}`;
}

function documentStepMeaning(depth: number, index: number, id: string | null): string {
  if (index % 2 === 1) return `the ${ordinal((index + 1) / 2)} run of text at this level`;
  if (depth === 0 && index === BODY_INDEX) return "the body, the root element's 2nd child";
  return `the ${ordinal(index / 2)} child element${assertion(id)}`;
}

function cfiPartMeaning(part: CfiPart): string {
  return match(part)
    .with({ kind: 'step', place: 'package' }, (step) =>
      packageStepMeaning(step.depth, step.index, step.id),
    )
    .with({ kind: 'step', place: 'document' }, (step) =>
      documentStepMeaning(step.depth, step.index, step.id),
    )
    .with({ kind: 'indirection' }, () => 'into the chapter document that itemref names')
    .with({ kind: 'offset' }, (offset) => `${offset.at} UTF-16 code units into that text`)
    .with({ kind: 'range-start' }, () => 'a range: the start, continuing from the common path')
    .with({ kind: 'range-end' }, () => 'the end, continuing from the common path')
    .exhaustive();
}

function spinePosition(parts: readonly CfiPart[]): number | null {
  const itemref = parts.find(
    (part) => part.kind === 'step' && part.place === 'package' && part.depth === 1,
  );
  return itemref?.kind === 'step' ? itemref.index / 2 : null;
}

export { cfiPartMeaning, ordinal, readCfi, spinePosition };
export type { CfiPart, StepPlace };
