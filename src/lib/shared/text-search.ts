const KATAKANA_FIRST = 0x30a1;
const KATAKANA_LAST = 0x30f6;
const KANA_SHIFT = 0x60;

const VOICED = '゙';
const SEMI_VOICED = '゚';

const STANDALONE_MARKS = new Map<string, string>([
  ['゛', VOICED],
  ['゜', SEMI_VOICED],
]);

type FoldedText = { readonly text: string; readonly origins: readonly number[] };

type TextMatch = { readonly start: number; readonly end: number };

type TextSegment = { readonly text: string; readonly matched: boolean };

const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

function clustersOf(text: string): readonly string[] {
  return [...GRAPHEMES.segment(text)].map((found) => found.segment);
}

function widthFolded(character: string): string {
  return STANDALONE_MARKS.get(character) ?? character.normalize('NFKC');
}

function kanaFolded(character: string): string {
  const code = character.codePointAt(0);
  if (code === undefined || code < KATAKANA_FIRST || code > KATAKANA_LAST) return character;

  return String.fromCodePoint(code - KANA_SHIFT);
}

function composedWith(previous: string, mark: string): string {
  if (previous.length !== 1 || (mark !== VOICED && mark !== SEMI_VOICED)) return '';

  const composed = (previous + mark).normalize('NFC');
  return composed.length === 1 ? composed : '';
}

function foldForSearch(text: string): FoldedText {
  const origins: number[] = [];
  let folded = '';
  let offset = 0;

  for (const character of clustersOf(text)) {
    for (const part of widthFolded(character).toLowerCase()) {
      const shifted = kanaFolded(part);
      const composed = composedWith(folded.slice(-1), shifted);

      if (composed !== '') {
        folded = folded.slice(0, -1) + composed;
        continue;
      }

      folded += shifted;
      for (let unit = 0; unit < shifted.length; unit += 1) origins.push(offset);
    }

    offset += character.length;
  }

  return { text: folded, origins };
}

function textMatches(text: string, query: string): readonly TextMatch[] {
  const needle = foldForSearch(query.trim()).text;
  if (needle.length === 0) return [];

  const haystack = foldForSearch(text);
  const matches: TextMatch[] = [];
  let from = 0;

  for (;;) {
    const found = haystack.text.indexOf(needle, from);
    if (found < 0) return matches;

    const start = haystack.origins[found] ?? 0;
    const end = haystack.origins[found + needle.length] ?? text.length;
    if (end > start) matches.push({ start, end });

    from = found + needle.length;
  }
}

function matchesQuery(text: string, query: string): boolean {
  return textMatches(text, query).length > 0;
}

function segmentsOf(text: string, matches: readonly TextMatch[]): readonly TextSegment[] {
  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const found of matches) {
    if (found.start < cursor) continue;
    if (found.start > cursor) {
      segments.push({ text: text.slice(cursor, found.start), matched: false });
    }

    segments.push({ text: text.slice(found.start, found.end), matched: true });
    cursor = found.end;
  }

  if (cursor < text.length) segments.push({ text: text.slice(cursor), matched: false });
  return segments;
}

export { foldForSearch, textMatches, matchesQuery, segmentsOf };
export type { FoldedText, TextMatch, TextSegment };
