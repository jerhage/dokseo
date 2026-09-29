import { match } from 'ts-pattern';

type VerticalMode = 'vertical-rl' | 'vertical-lr';

type WritingMode = 'horizontal' | VerticalMode;

type TextDirection = 'ltr' | 'rtl';

type BookPaging =
  | { readonly axis: 'vertical'; readonly mode: VerticalMode }
  | { readonly axis: 'horizontal'; readonly direction: TextDirection };

type ChapterDirections = {
  readonly bodyDir: string;
  readonly rootDir: string;
  readonly direction: string;
};

type MeasuredChapter = {
  readonly writingMode: string;
  readonly direction: TextDirection;
};

type ChapterProbe = {
  readonly chapters: number;
  readonly hasText: (index: number) => Promise<boolean>;
  readonly measure: (index: number) => Promise<MeasuredChapter | null>;
};

const HORIZONTAL: WritingMode = 'horizontal';

const LEFT_TO_RIGHT_PAGES: BookPaging = { axis: 'horizontal', direction: 'ltr' };

const RIGHT_TO_LEFT = 'rtl';

const PRIMARY_WRITING_MODE = 'primary-writing-mode';

function writingModeNamed(value: string | null | undefined): WritingMode | null {
  const named = value?.trim().toLowerCase() ?? '';
  if (named === 'vertical-rl') return 'vertical-rl';
  if (named === 'vertical-lr') return 'vertical-lr';
  if (named.startsWith('horizontal-')) return HORIZONTAL;
  return null;
}

function chapterDirection(read: ChapterDirections): TextDirection {
  const rtl =
    read.bodyDir === RIGHT_TO_LEFT ||
    read.direction === RIGHT_TO_LEFT ||
    read.rootDir === RIGHT_TO_LEFT;
  return rtl ? 'rtl' : 'ltr';
}

async function firstTextChapter(probe: ChapterProbe): Promise<MeasuredChapter | null> {
  for (let index = 0; index < probe.chapters; index += 1) {
    if (!(await probe.hasText(index))) continue;

    return probe.measure(index);
  }

  return null;
}

function horizontalPaging(measured: MeasuredChapter | null): BookPaging {
  return measured === null
    ? LEFT_TO_RIGHT_PAGES
    : { axis: 'horizontal', direction: measured.direction };
}

function measuredPaging(measured: MeasuredChapter | null): BookPaging {
  return match(writingModeNamed(measured?.writingMode))
    .with('vertical-rl', 'vertical-lr', (mode): BookPaging => ({ axis: 'vertical', mode }))
    .with('horizontal', null, () => horizontalPaging(measured))
    .exhaustive();
}

async function bookPaging(
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
}

function pagingWritingMode(paging: BookPaging): WritingMode {
  return match(paging)
    .with({ axis: 'vertical' }, ({ mode }) => mode)
    .with({ axis: 'horizontal' }, () => HORIZONTAL)
    .exhaustive();
}

function onePagingAxis(mode: WritingMode): string {
  return match(mode)
    .with('horizontal', () => '')
    .with(
      'vertical-rl',
      'vertical-lr',
      (vertical) => `
  html, body {
    writing-mode: ${vertical} !important;
  }
`,
    )
    .exhaustive();
}

export {
  bookPaging,
  chapterDirection,
  HORIZONTAL,
  LEFT_TO_RIGHT_PAGES,
  measuredPaging,
  onePagingAxis,
  pagingWritingMode,
  PRIMARY_WRITING_MODE,
  writingModeNamed,
};
export type {
  BookPaging,
  ChapterDirections,
  ChapterProbe,
  MeasuredChapter,
  TextDirection,
  VerticalMode,
  WritingMode,
};
