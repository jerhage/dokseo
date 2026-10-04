import type { SourceKind } from '$lib/domains/library/domain/book/book';
import type { Capture } from '$lib/domains/recognition/domain/capture/capture';
import type { Tag } from '$lib/domains/recognition/domain/tag/tag';
import type { ContentHash, SeriesId } from '$lib/shared/ids';
import type { Language } from '$lib/shared/language';
import type { LayoutKind, ReadingDirection } from '$lib/shared/layout-kind';
import type { JsonValue } from './json-safe';

const CAPTURES_FILE_FORMAT = 'dokseo-captures';

const CAPTURES_FILE_VERSION = 1;

type FileBook = {
  readonly key: string;
  readonly contentHash: ContentHash;
  readonly fileName: string;
  readonly title: string;
  readonly alias: string | null;
  readonly seriesId: SeriesId | null;
  readonly volume: number | null;
  readonly language: Language;
  readonly direction: ReadingDirection;
  readonly layoutKind: LayoutKind;
  readonly sourceKind: SourceKind;
  readonly imageCount: number;
};

type RetiredFileBook = { readonly key: string } & {
  readonly [Field in Exclude<keyof FileBook, 'key'>]?: unknown;
};

type WithoutBook<C> = C extends unknown ? Omit<C, 'bookId'> : never;

type BooklessCapture = WithoutBook<Capture>;

type FileCapture = BooklessCapture & { readonly bookKey: string };

type UnreadableSection = {
  readonly books: readonly JsonValue[];
  readonly tags: readonly JsonValue[];
  readonly captures: readonly JsonValue[];
};

type CapturesFile = {
  readonly format: typeof CAPTURES_FILE_FORMAT;
  readonly version: typeof CAPTURES_FILE_VERSION;
  readonly exportedAt: number;
  readonly appVersion: string;
  readonly books: readonly (FileBook | RetiredFileBook)[];
  readonly tags: readonly Tag[];
  readonly captures: readonly FileCapture[];
  readonly unreadable?: UnreadableSection;
};

export { CAPTURES_FILE_FORMAT, CAPTURES_FILE_VERSION };
export type {
  BooklessCapture,
  CapturesFile,
  FileBook,
  FileCapture,
  RetiredFileBook,
  UnreadableSection,
};
