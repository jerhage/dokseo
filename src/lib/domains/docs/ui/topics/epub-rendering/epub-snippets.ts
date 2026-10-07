type SourceSnippet = {
  readonly label: string;
  readonly file: string;
  readonly code: string;
};

const TURN_LOCK: SourceSnippet = {
  label: 'foliate-js, paginator.js: a page turn',
  file: 'node_modules/foliate-js/paginator.js',
  code: `async #turnPage(dir, distance) {
    if (this.#locked) return
    this.#locked = true
    const prev = dir === -1
    const shouldGo = await (prev ? this.#scrollPrev(distance) : this.#scrollNext(distance))
    if (shouldGo) await this.#goTo({
        index: this.#adjacentIndex(dir),
        anchor: prev ? () => 1 : () => 0,
    })
    if (shouldGo || !this.hasAttribute('animated')) await wait(100)
    this.#locked = false
}`,
};

const COLUMNIZE: SourceSnippet = {
  label: 'foliate-js, paginator.js: the start of columnize',
  file: 'node_modules/foliate-js/paginator.js',
  code: `columnize({ width, height, margin, gap, columnWidth }) {
    const vertical = this.#vertical
    this.#size = vertical ? height : width

    const doc = this.document
    setStylesImportant(doc.documentElement, {
        'box-sizing': 'border-box',
        'column-width': \`\${Math.trunc(columnWidth)}px\`,
        'column-gap': vertical ? \`\${margin}px\` : \`\${gap}px\`,
        'column-fill': 'auto',
        ...(vertical
            ? { 'width': \`\${width}px\` }
            : { 'height': \`\${height}px\` }),
        'padding': vertical ? \`\${margin / 2}px \${gap}px\` : \`0 \${gap / 2}px\`,
        'overflow': 'hidden',`,
};

const GET_DIRECTION: SourceSnippet = {
  label: 'foliate-js, paginator.js: each chapter’s direction',
  file: 'node_modules/foliate-js/paginator.js',
  code: `const getDirection = doc => {
    const { defaultView } = doc
    const { writingMode, direction } = defaultView.getComputedStyle(doc.body)
    const vertical = writingMode === 'vertical-rl'
        || writingMode === 'vertical-lr'
    const rtl = doc.body.dir === 'rtl'
        || direction === 'rtl'
        || doc.documentElement.dir === 'rtl'
    return { vertical, rtl }
}`,
};

const GO_LEFT_RIGHT: SourceSnippet = {
  label: 'foliate-js, view.js: left and right follow the spine',
  file: 'node_modules/foliate-js/view.js',
  code: `goLeft() {
    return this.book.dir === 'rtl' ? this.next() : this.prev()
}
goRight() {
    return this.book.dir === 'rtl' ? this.prev() : this.next()
}`,
};

const FLOW_STYLES: SourceSnippet = {
  label: 'src/lib/domains/flowing/ui/flow-styles.ts, excerpt',
  file: 'src/lib/domains/flowing/ui/flow-styles.ts',
  code: `const THE_READINGS_ARE_PUT_AWAY = \`
  rt, rp {
    display: none !important;
  }
\`;

function sizedForTheReader(settings: ReadingSettings): string {
  return \`
  html {
    font-size: \${textSizePercent(settings.textSize)}% !important;
  }

  p, li, dd, blockquote {
    line-height: \${lineSpacingHeight(settings.lineSpacing)} !important;
  }
\`;
}

function flowStyles(
  settings: ReadingSettings,
  ink: PageInk = INK_FOR_THE_DARK_PAGE,
  mode: WritingMode = HORIZONTAL,
): readonly [string, string] {
  const readings = settings.showPhoneticReadings ? '' : THE_READINGS_ARE_PUT_AWAY;

  return [
    readableOnThePage(ink),
    \`\${overridesABookThatForcesItsOwnInk(ink)}\${aSelectionIsSeenWhereverFocusIs(ink)}\${sizedForTheReader(settings)}\${readings}\${onePagingAxis(mode)}\`,
  ];
}

function sameInk(one: PageInk, other: PageInk): boolean {`,
};

const BOOK_PAGING: SourceSnippet = {
  label: 'src/lib/domains/flowing/ui/flow-writing-mode.ts, excerpt',
  file: 'src/lib/domains/flowing/ui/flow-writing-mode.ts',
  code: `async function bookPaging(
  declared: string | null | undefined,
  probe: ChapterProbe,
): Promise<BookPaging> {
  return match(writingModeNamed(declared))
    .with('vertical-rl', 'vertical-lr', (mode): Promise<BookPaging> =>
      Promise.resolve({ axis: 'vertical', mode }),
    )
    .with('horizontal', async () => horizontalPaging(await firstTextChapter(probe)))
    .with(null, async () => measuredPaging(await firstTextChapter(probe)))
    .exhaustive();
}`,
};

const GO_TO_PASSAGE: SourceSnippet = {
  label: 'src/lib/domains/flowing/ui/flow-surface.ts, excerpt',
  file: 'src/lib/domains/flowing/ui/flow-surface.ts',
  code: `async function goToPassage(
  view: Navigable,
  spine: Spine,
  find: FindPassage,
  passage: SoughtPassage,
): Promise<PassageArrival> {
  const stored = await navigate(view, spine, passage.cfi);
  if (reached(stored) && !collapsedCfi(passage.cfi)) return arrivedAtTheCfi(passage.cfi);
  if (passage.quote === null) return THE_PASSAGE_IS_LOST;

  const fresh = await find(passage.quote);
  if (fresh === null) return THE_PASSAGE_IS_LOST;

  const refound = await navigate(view, spine, fresh);
  return reached(refound) ? foundByItsText(fresh) : THE_PASSAGE_IS_LOST;`,
};

const OPEN_SURFACE: SourceSnippet = {
  label: 'src/lib/domains/flowing/ui/flow-surface.ts, the start of openFlowSurface',
  file: 'src/lib/domains/flowing/ui/flow-surface.ts',
  code: `async function openFlowSurface(
  host: HTMLElement,
  opening: FlowOpening,
  bind: BindChapter,
): Promise<FlowSurface> {
  const { View: FoliateView, makeBook } = await import('foliate-js/view.js');
  const { Overlayer } = await import('foliate-js/overlayer.js');
  const book = await makeBook(
    new File([opening.source], SOURCE_FILE_NAME, { type: EPUB_MEDIA_TYPE }),
  );
  sanitiseChapters(book, sanitiseChapter);

  const spine = spineOf(book);
  leaveOutSectionsWithNoBody(book, spine);
  const paging = await bookPaging(declaredWritingMode(book), chapterProbe(host, book));
  const mode = pagingWritingMode(paging);`,
};

const LOCATE_QUOTE: SourceSnippet = {
  label: 'src/lib/domains/flowing/ui/flow-quote.ts, excerpt',
  file: 'src/lib/domains/flowing/ui/flow-quote.ts',
  code: `function contextScore(text: string, quote: TextQuote, at: number): number {
  const before = commonSuffix(text.slice(0, at), quote.prefix);
  const after = commonPrefix(text.slice(at + quote.exact.length), quote.suffix);

  return before + after;
}

function locateQuote(text: string, quote: TextQuote): QuoteHit | null {
  const exact = quote.exact;
  if (exact.length === 0) return null;

  let best: QuoteHit | null = null;
  let bestScore = -1;

  for (let at = text.indexOf(exact); at !== -1; at = text.indexOf(exact, at + 1)) {
    const score = contextScore(text, quote, at);
    if (score > bestScore) {
      bestScore = score;
      best = { start: at, end: at + exact.length };
    }
  }

  return best;
}`,
};

const ARRIVAL_NOTICES: SourceSnippet = {
  label: 'src/lib/domains/flowing/ui/flow-quote.ts, the two notices',
  file: 'src/lib/domains/flowing/ui/flow-quote.ts',
  code: `const MOVED_SINCE_IT_WAS_CAPTURED =
  'This passage moved since it was captured, so it was found by its text.';

const NOT_IN_THE_BOOK_ANY_MORE = 'This passage is no longer anywhere in this book.';`,
};

const KEEP_TAP: SourceSnippet = {
  label: 'src/lib/domains/flowing/ui/FlowViewer.svelte, excerpt',
  file: 'src/lib/domains/flowing/ui/FlowViewer.svelte',
  code: `function keepTurningTapFromFoliate(event: TouchEvent): void {
  if (gestures?.claimsTouchEnd() === true) event.stopPropagation();
}`,
};

const EPUB_SNIPPETS: readonly SourceSnippet[] = [
  TURN_LOCK,
  COLUMNIZE,
  GET_DIRECTION,
  GO_LEFT_RIGHT,
  FLOW_STYLES,
  BOOK_PAGING,
  GO_TO_PASSAGE,
  OPEN_SURFACE,
  LOCATE_QUOTE,
  ARRIVAL_NOTICES,
  KEEP_TAP,
];

export {
  ARRIVAL_NOTICES,
  BOOK_PAGING,
  COLUMNIZE,
  EPUB_SNIPPETS,
  FLOW_STYLES,
  GET_DIRECTION,
  GO_LEFT_RIGHT,
  GO_TO_PASSAGE,
  KEEP_TAP,
  LOCATE_QUOTE,
  OPEN_SURFACE,
  TURN_LOCK,
};
export type { SourceSnippet };
