import type { SourceSnippet } from '../ocr/ocr-snippets';

const FILE_ENTRY: SourceSnippet = {
  label: 'library/adapters/file-entry.ts',
  file: 'src/lib/domains/library/adapters/file-entry.ts',
  code: `function canonical(text: string): string {
  return text.normalize('NFC');
}

function entryName(file: File): string {
  const named = file.webkitRelativePath.length > 0 ? file.webkitRelativePath : file.name;

  return canonical(named);
}`,
};

const MATCHABLE_TITLE: SourceSnippet = {
  label: 'matchableTitle, in library/domain/book/book-matching.ts',
  file: 'src/lib/domains/library/domain/book/book-matching.ts',
  code: `function matchableTitle(title: string): string | null {
  const normalised = title.normalize('NFC').trim();
  if (normalised.length === 0 || normalised === UNTITLED_BOOK) return null;
  return normalised;
}`,
};

const FOLD_PARTS: SourceSnippet = {
  label: 'The folds for one character, in shared/text-search.ts',
  file: 'src/lib/shared/text-search.ts',
  code: `const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

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
}`,
};

const FOLD_LOOP: SourceSnippet = {
  label: 'foldForSearch, in shared/text-search.ts',
  file: 'src/lib/shared/text-search.ts',
  code: `for (const character of clustersOf(text)) {
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
  }`,
};

const TAG_NAME: SourceSnippet = {
  label: 'recognition/domain/tag/tag.ts',
  file: 'src/lib/domains/recognition/domain/tag/tag.ts',
  code: `function tagName(raw: string): string {
  return raw.trim().normalize('NFC').replaceAll(INNER_SPACE, ' ');
}`,
};

const SAME_TAG_NAME: SourceSnippet = {
  label: 'sameTagName, in recognition/domain/tag/tag.ts',
  file: 'src/lib/domains/recognition/domain/tag/tag.ts',
  code: `function sameTagName(left: string, right: string): boolean {
  return foldForSearch(tagName(left)).text === foldForSearch(tagName(right)).text;
}`,
};

const COMPARE_NATURAL: SourceSnippet = {
  label: 'library/domain/ingest/natural-order.ts',
  file: 'src/lib/domains/library/domain/ingest/natural-order.ts',
  code: `const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function compareNatural(a: string, b: string): number {
  const byCollator = collator.compare(a, b);
  if (byCollator !== 0) return byCollator;
  if (a === b) return 0;
  return a < b ? -1 : 1;
}`,
};

const QUOTE_CONTEXT: SourceSnippet = {
  label: 'flowing/ui/flow-lift.ts',
  file: 'src/lib/domains/flowing/ui/flow-lift.ts',
  code: `function keptBefore(text: string): string {
  const runes = Array.from(text);
  return runes.slice(Math.max(0, runes.length - QUOTE_CONTEXT_CHARS)).join('');
}

function keptAfter(text: string): string {
  return Array.from(text).slice(0, QUOTE_CONTEXT_CHARS).join('');
}`,
};

const READINGS_PUT_AWAY: SourceSnippet = {
  label: 'flowing/ui/flow-styles.ts',
  file: 'src/lib/domains/flowing/ui/flow-styles.ts',
  code: `const THE_READINGS_ARE_PUT_AWAY = \`
  rt, rp {
    display: none !important;
  }
\`;`,
};

const WITHOUT_READINGS: SourceSnippet = {
  label: 'flowing/ui/flow-passage.ts',
  file: 'src/lib/domains/flowing/ui/flow-passage.ts',
  code: `function withoutReadings(fragment: DocumentFragment): string {
  for (const reading of fragment.querySelectorAll(RUBY_READINGS)) reading.remove();

  return fragment.textContent ?? '';
}`,
};

const OCR_TEXT: SourceSnippet = {
  label: 'recognition/domain/engine/japanese-ocr-text.ts',
  file: 'src/lib/domains/recognition/domain/engine/japanese-ocr-text.ts',
  code: `function japaneseOcrText(decoded: string): string {
  return decoded.replace(/\\s+/gu, '');
}`,
};

const LANG_FONTS: SourceSnippet = {
  label: 'styles/base/elements.css',
  file: 'src/lib/styles/base/elements.css',
  code: `:where([lang]:lang(ja)) {
  --font-body: var(--font-ja);
  --font-display: var(--font-ja);
  font-family: var(--font-ja);
}`,
};

const UNICODE_SNIPPETS: readonly SourceSnippet[] = [
  FILE_ENTRY,
  MATCHABLE_TITLE,
  FOLD_PARTS,
  FOLD_LOOP,
  TAG_NAME,
  SAME_TAG_NAME,
  COMPARE_NATURAL,
  QUOTE_CONTEXT,
  READINGS_PUT_AWAY,
  WITHOUT_READINGS,
  OCR_TEXT,
  LANG_FONTS,
];

export {
  COMPARE_NATURAL,
  FILE_ENTRY,
  FOLD_LOOP,
  FOLD_PARTS,
  LANG_FONTS,
  MATCHABLE_TITLE,
  OCR_TEXT,
  QUOTE_CONTEXT,
  READINGS_PUT_AWAY,
  SAME_TAG_NAME,
  TAG_NAME,
  UNICODE_SNIPPETS,
  WITHOUT_READINGS,
};
