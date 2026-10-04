import { compareNatural } from '$lib/domains/library/domain/ingest/natural-order';
import { sameTagName } from '$lib/domains/recognition/domain/tag/tag';
import { foldForSearch, segmentsOf, textMatches } from '$lib/shared/text-search';
import type { TextSegment } from '$lib/shared/text-search';
import { collatorComparisons, plainComparisons } from '../../../domain/unicode-text';
import type { Comparison } from '../../../domain/unicode-text';

type SameOrNot = {
  readonly plain: readonly Comparison[];
  readonly collator: readonly Comparison[];
  readonly dokseo: Comparison;
};

type SearchFold = {
  readonly foldedText: string;
  readonly foldedQuery: string;
  readonly segments: readonly TextSegment[];
  readonly found: boolean;
};

const COLLATOR_LOCALE = 'ja';

function sameOrNot(left: string, right: string): SameOrNot {
  return {
    plain: plainComparisons(left, right),
    collator: collatorComparisons(left, right, COLLATOR_LOCALE),
    dokseo: { label: 'sameTagName(left, right)', equal: sameTagName(left, right) },
  };
}

function searchFold(text: string, query: string): SearchFold {
  const matches = textMatches(text, query);
  return {
    foldedText: foldForSearch(text).text,
    foldedQuery: foldForSearch(query.trim()).text,
    segments: segmentsOf(text, matches),
    found: matches.length > 0,
  };
}

function naturalOrder(names: readonly string[]): readonly string[] {
  return names.toSorted(compareNatural);
}

function codeUnitOrder(names: readonly string[]): readonly string[] {
  return names.toSorted();
}

export { codeUnitOrder, naturalOrder, sameOrNot, searchFold };
export type { SameOrNot, SearchFold };
