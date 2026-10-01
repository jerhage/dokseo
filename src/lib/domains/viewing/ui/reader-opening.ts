import { match } from 'ts-pattern';
import type { Container } from '$lib/container';

type OpenOutcome = Awaited<ReturnType<Container['library']['openForReading']>>;

type ReaderBook = Extract<OpenOutcome, { readonly kind: 'images' }>['book'];

type FlowBook = Extract<OpenOutcome, { readonly kind: 'flow' }>['book'];

type ReaderOpening =
  | { readonly kind: 'idle' }
  | { readonly kind: 'opening' }
  | { readonly kind: 'missing'; readonly message: string }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'empty'; readonly book: ReaderBook }
  | { readonly kind: 'images'; readonly book: ReaderBook; readonly notice: string | null }
  | { readonly kind: 'flow'; readonly book: FlowBook };

type ShownOpening = Extract<ReaderOpening, { readonly kind: 'images' }>;

type CurtainOpening = Exclude<ReaderOpening, { readonly kind: 'images' }>;

type ReaderStage = 'settling' | 'reading' | 'empty' | 'failed';

const NOT_OPENED: ReaderOpening = { kind: 'idle' };

const OPENING: ReaderOpening = { kind: 'opening' };

function shownBook(opening: ReaderOpening): ReaderBook | null {
  return opening.kind === 'images' || opening.kind === 'empty' ? opening.book : null;
}

function heldBook(opening: ReaderOpening): ReaderBook | FlowBook | null {
  return match(opening)
    .with({ kind: 'images' }, { kind: 'empty' }, { kind: 'flow' }, (held) => held.book)
    .with(
      { kind: 'idle' },
      { kind: 'opening' },
      { kind: 'missing' },
      { kind: 'failed' },
      () => null,
    )
    .exhaustive();
}

function withBook(opening: ReaderOpening, book: ReaderBook): ReaderOpening {
  return match(opening)
    .with({ kind: 'images' }, { kind: 'empty' }, (held): ReaderOpening => ({ ...held, book }))
    .with(
      { kind: 'idle' },
      { kind: 'opening' },
      { kind: 'missing' },
      { kind: 'failed' },
      { kind: 'flow' },
      (other): ReaderOpening => other,
    )
    .exhaustive();
}

function readerStage(opening: ReaderOpening): ReaderStage {
  return match(opening)
    .with(
      { kind: 'idle' },
      { kind: 'opening' },
      { kind: 'missing' },
      { kind: 'flow' },
      (): ReaderStage => 'settling',
    )
    .with({ kind: 'images' }, (): ReaderStage => 'reading')
    .with({ kind: 'empty' }, (): ReaderStage => 'empty')
    .with({ kind: 'failed' }, (): ReaderStage => 'failed')
    .exhaustive();
}

function readerCurtain(opening: ReaderOpening): string | null {
  return match(opening)
    .with(
      { kind: 'idle' },
      { kind: 'opening' },
      { kind: 'missing' },
      { kind: 'flow' },
      () => 'Opening the book…',
    )
    .with({ kind: 'images' }, () => null)
    .with({ kind: 'empty' }, () => 'This book holds no pages to show.')
    .with({ kind: 'failed' }, (failed) => failed.message)
    .exhaustive();
}

function readingNotice(opening: ReaderOpening): string | null {
  return opening.kind === 'images' ? opening.notice : null;
}

export {
  NOT_OPENED,
  OPENING,
  heldBook,
  readerCurtain,
  readerStage,
  readingNotice,
  shownBook,
  withBook,
};
export type {
  CurtainOpening,
  FlowBook,
  OpenOutcome,
  ReaderBook,
  ReaderOpening,
  ReaderStage,
  ShownOpening,
};
