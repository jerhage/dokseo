import type { SourceSnippet } from '../ocr/ocr-snippets';

const BRANDED_IDS_SOURCE: SourceSnippet = {
  label: 'src/lib/shared/ids.ts, the brand and two of its ids',
  file: 'src/lib/shared/ids.ts',
  code: `declare const brand: unique symbol;

type Branded<T, B extends string> = T & { readonly [brand]: B };

type BookId = Branded<string, 'BookId'>;`,
};

const MINTED_IDS: SourceSnippet = {
  label: 'Minting and parsing a book id, in shared/ids.ts',
  file: 'src/lib/shared/ids.ts',
  code: `function bookId(value: string): BookId {
  return value as BookId;
}

function parsedBookId(raw: string): BookId | null {
  const flat = raw.length > 0 && !raw.includes('/') && !raw.includes('\\\\') && !raw.includes('..');
  return flat ? bookId(raw) : null;
}`,
};

const IMAGE_INDEX: SourceSnippet = {
  label: 'A branded number, in shared/ids.ts',
  file: 'src/lib/shared/ids.ts',
  code: `type ImageIndex = Branded<number, 'ImageIndex'>;`,
};

const SPACE_RECT: SourceSnippet = {
  label: 'src/lib/shared/geometry.ts',
  file: 'src/lib/shared/geometry.ts',
  code: `declare const space: unique symbol;

type Rect<in out S extends string> = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly [space]: (s: S) => S;
};

type ScreenRect = Rect<'screen'>;

type ImageRect = Rect<'image'>;

function rect<S extends string>(x: number, y: number, width: number, height: number): Rect<S> {
  return { x, y, width, height } as Rect<S>;
}`,
};

const SCREEN_TO_IMAGE: SourceSnippet = {
  label: 'The one conversion, in viewing/domain/placement.ts',
  file: 'src/lib/domains/viewing/domain/placement.ts',
  code: `function toImageRect(placed: PlacedImage, selection: ScreenRect): ImageRect | null {
  const frame = frameOf(placed);
  if (frame === null) return null;

  const overlap = clampTo(selection, frame);
  if (isEmpty(overlap)) return null;

  const scaleX = placed.natural.width / frame.width;
  const scaleY = placed.natural.height / frame.height;

  return imageRect(
    (overlap.x - frame.x) * scaleX,
    (overlap.y - frame.y) * scaleY,
    overlap.width * scaleX,
    overlap.height * scaleY,
  );
}`,
};

const STORED_FIELDS: SourceSnippet = {
  label: 'src/lib/shared/corrupt-row.ts, the parts a mapper uses',
  file: 'src/lib/shared/corrupt-row.ts',
  code: `function knownStoredValue<T>(
  row: string,
  field: string,
  value: unknown,
  known: (value: unknown) => value is T,
): T {
  if (known(value)) return value;
  throw new CorruptRow(row, field, value);
}

function isStoredFields(value: unknown): value is StoredFields {
  return typeof value === 'object' && value !== null;
}`,
};

const STORED_CAPTURE_TYPE: SourceSnippet = {
  label: 'The stored row type, in recognition/domain/capture/capture.ts',
  file: 'src/lib/domains/recognition/domain/capture/capture.ts',
  code: `type StoredCapture = { readonly [Field in keyof RecognizedCapture]?: unknown };`,
};

const STORED_ANCHOR: SourceSnippet = {
  label: 'Reading the anchor of a stored capture',
  file: 'src/lib/domains/recognition/domain/capture/capture.ts',
  code: `function storedAnchor(value: unknown): Anchor {
  const anchor = captureField('anchor', value, isStoredFields);
  return match(anchor.kind)
    .with('region', () =>
      regionAnchor(captureField('regions', anchor.regions, isStoredList).map(storedRegion)),
    )
    .with('text', () =>
      textAnchor(
        captureField('anchor cfi', anchor.cfi, isText),
        storedQuote(anchor.quote),
        captureField('chapter', anchor.chapter, isTextOrNull),
      ),
    )
    .otherwise((kind) => {
      throw new CorruptRow('capture', 'anchor kind', kind);
    });
}`,
};

const CAPTURE_UNION: SourceSnippet = {
  label: 'The capture variants, in recognition/domain/capture/capture.ts',
  file: 'src/lib/domains/recognition/domain/capture/capture.ts',
  code: `type RecognizedCapture = RecognizedDraft &
  CaptureHistory & {
    readonly note: string | null;
  };

type WrittenCapture = WrittenDraft & CaptureHistory;

type LiftedCapture = LiftedDraft &
  CaptureHistory & {
    readonly note: string | null;
  };

type Capture = RecognizedCapture | WrittenCapture | LiftedCapture;

type NotableCapture = RecognizedCapture | LiftedCapture;`,
};

const CAPTURE_ORIGIN_MATCH: SourceSnippet = {
  label: 'Building the variant from a stored origin',
  file: 'src/lib/domains/recognition/domain/capture/capture.ts',
  code: `return match(storedOrigin(stored))
  .with('written', () => ({ ...held, origin: 'written' as const }))
  .with('lifted', () => ({ ...held, origin: 'lifted' as const, note: storedNote(stored) }))
  .with('recognized', () => ({
    ...held,
    origin: 'recognized' as const,
    note: storedNote(stored),
    confidence: storedConfidence(stored),
  }))
  .exhaustive();`,
};

const WRITE_NOTE: SourceSnippet = {
  label: 'recognition/use-cases/capture/write-capture-note.ts',
  file: 'src/lib/domains/recognition/use-cases/capture/write-capture-note.ts',
  code: `async function writeCaptureNote<T extends NotableCapture>(
  deps: WriteCaptureNoteDeps,
  capture: T,
  note: string,
): Promise<WriteCaptureNoteResult<T>> {`,
};

const MARQUEE_END: SourceSnippet = {
  label: 'src/lib/components/marquee-selection.ts',
  file: 'src/lib/components/marquee-selection.ts',
  code: `type MarqueeEnd =
  | { readonly kind: 'click' }
  | { readonly kind: 'too-small'; readonly selection: MarqueeRect }
  | { readonly kind: 'selection'; readonly selection: MarqueeRect };`,
};

const MARQUEE_CLASSIFIER: SourceSnippet = {
  label: 'The classifier, in components/marquee-selection.ts',
  file: 'src/lib/components/marquee-selection.ts',
  code: `function marqueeEnd(
  from: MarqueePoint,
  to: MarqueePoint,
  slop: number,
  minimum: number,
): MarqueeEnd {
  const selection = marqueeRect(from, to);
  if (within(selection, slop)) return { kind: 'click' };
  if (selection.width < minimum || selection.height < minimum) {
    return { kind: 'too-small', selection };
  }

  return { kind: 'selection', selection };
}`,
};

const SELECTION_ARM: SourceSnippet = {
  label: 'The selection arm, in viewing/ui/SelectionLayer.svelte',
  file: 'src/lib/domains/viewing/ui/SelectionLayer.svelte',
  code: `.with({ kind: 'selection' }, ({ selection }) => {
  const rect = screenRect(selection.x, selection.y, selection.width, selection.height);`,
};

const READING_PLACE: SourceSnippet = {
  label: 'src/lib/shared/reading-place.ts',
  file: 'src/lib/shared/reading-place.ts',
  code: `type ImagePlace = {
  readonly kind: 'image';
  readonly index: ImageIndex;
  readonly shownThrough: ImageIndex;
  readonly offset: number;
};

type TextPlace = { readonly kind: 'text'; readonly cfi: string; readonly fraction: number | null };

type ReadingPlace = ImagePlace | TextPlace;`,
};

const RESUMED_CFI: SourceSnippet = {
  label: 'Narrowing a reading place, in shared/reading-place.ts',
  file: 'src/lib/shared/reading-place.ts',
  code: `function resumedCfi(place: ReadingPlace): string | null {
  if (place.kind !== 'text') return null;
  return place.cfi === WHEREVER_THE_BOOK_STARTS ? null : place.cfi;
}`,
};

const ANCHOR_UNION: SourceSnippet = {
  label: 'src/lib/shared/anchor.ts',
  file: 'src/lib/shared/anchor.ts',
  code: `type Anchor = { readonly kind: 'region'; readonly regions: readonly ImageRegion[] } | TextAnchor;`,
};

const READ_SNAPSHOT: SourceSnippet = {
  label: 'src/lib/shared/read-state.ts',
  file: 'src/lib/shared/read-state.ts',
  code: `type ReadSnapshot<T> =
  | { readonly status: 'pending' }
  | { readonly status: 'error'; readonly isLoadingError: true; readonly error: unknown }
  | { readonly status: 'error'; readonly isLoadingError: false; readonly data: T }
  | { readonly status: 'success'; readonly data: T };`,
};

const READ_STATE_OF: SourceSnippet = {
  label: 'From the snapshot to ReadState, in shared/read-state.ts',
  file: 'src/lib/shared/read-state.ts',
  code: `function readStateOf<T>(snapshot: ReadSnapshot<T>): ReadState<T> {
  return match(snapshot)
    .with({ status: 'pending' }, (): ReadState<T> => LOADING)
    .with({ status: 'error', isLoadingError: true }, ({ error }): ReadState<T> =>
      readFailed(failureMessage(error)),
    )
    .with({ status: 'error', isLoadingError: false }, ({ data }) => readReady(data))
    .with({ status: 'success' }, ({ data }) => readReady(data))
    .exhaustive();
}`,
};

const READ_QUERY: SourceSnippet = {
  label: 'Passing the library result in, in shared/read-query.svelte.ts',
  file: 'src/lib/shared/read-query.svelte.ts',
  code: `const query = createQuery(options, client);
const state = $derived(readStateOf(query));`,
};

const LANGUAGE: SourceSnippet = {
  label: 'src/lib/shared/language.ts',
  file: 'src/lib/shared/language.ts',
  code: `const LANGUAGES = ['ja', 'ko', 'en'] as const;

type Language = (typeof LANGUAGES)[number];

const LANGUAGE_LEGEND = 'Language';

function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((language) => language === value);
}`,
};

const MODEL_FOOTPRINT: SourceSnippet = {
  label: 'One model per language, in recognition/domain/model/model-footprint.ts',
  file: 'src/lib/domains/recognition/domain/model/model-footprint.ts',
  code: `function modelFootprint(language: Language): ModelFootprint | null {
  return match(language)
    .with('ja', () => JAPANESE_OCR_MODEL)
    .with('ko', () => KOREAN_OCR_MODEL)
    .with('en', () => ENGLISH_OCR_MODEL)
    .exhaustive();
}`,
};

const IMAGE_LAYOUT_KIND: SourceSnippet = {
  label: 'src/lib/shared/layout-kind.ts',
  file: 'src/lib/shared/layout-kind.ts',
  code: `type ImageLayoutKind = 'paged' | 'continuous';

type LayoutKind = ImageLayoutKind | 'flow';`,
};

const TO_IMAGE_LAYOUT: SourceSnippet = {
  label: 'The one way from wide to narrow, in shared/layout-kind.ts',
  file: 'src/lib/shared/layout-kind.ts',
  code: `function imageLayoutKind(layoutKind: LayoutKind): ImageLayoutKind | null {
  return layoutKind === 'flow' ? null : layoutKind;
}`,
};

const MOVE_ORDER: SourceSnippet = {
  label: 'A match over the narrow union, in viewing/ui/page-moves.ts',
  file: 'src/lib/domains/viewing/ui/page-moves.ts',
  code: `function moveOrder(layoutKind: ImageLayoutKind, direction: ReadingDirection): MoveOrder {
  return match(layoutKind)
    .with('paged', () => (direction === 'rtl' ? INCREMENT_FIRST : DECREMENT_FIRST))
    .with('continuous', () => DECREMENT_FIRST)
    .exhaustive();
}`,
};

const DOCK_TOKENS: SourceSnippet = {
  label: 'src/lib/components/dock.ts',
  file: 'src/lib/components/dock.ts',
  code: `const DOCK_DETENT_TOKENS = {
  standard: '--layout-sheet-height',
  tall: '--layout-sheet-height-tall',
} as const satisfies Record<DockDetent, \`--\${string}\`>;`,
};

const TAG_COLOURS_TAIL: SourceSnippet = {
  label:
    'The end of the color list and the union taken from it, in recognition/domain/tag/tag-colour.ts',
  file: 'src/lib/domains/recognition/domain/tag/tag-colour.ts',
  code: `] as const;

type TagColour = (typeof TAG_COLOURS)[number];`,
};

const REMEMBERED_SET: SourceSnippet = {
  label: 'Reading a saved list, in platform/storage/remembered-set.ts',
  file: 'src/lib/platform/storage/remembered-set.ts',
  code: `const parsed: unknown = JSON.parse(raw);
if (!Array.isArray(parsed)) return [];

return parsed.filter((entry) => typeof entry === 'string');`,
};

const PDF_RENDER: SourceSnippet = {
  label: 'A library boundary, in library/adapters/pdf-page-source.ts',
  file: 'src/lib/domains/library/adapters/pdf-page-source.ts',
  code: `const canvas = new OffscreenCanvas(size.width, size.height);
const context = canvas.getContext('2d');
if (context === null) throw new Error('A 2D drawing context was unavailable');
await page.render({
  canvas: null,
  canvasContext: context as unknown as CanvasRenderingContext2D,
  viewport,
}).promise;`,
};

const TYPE_SNIPPETS: readonly SourceSnippet[] = [
  BRANDED_IDS_SOURCE,
  MINTED_IDS,
  IMAGE_INDEX,
  SPACE_RECT,
  SCREEN_TO_IMAGE,
  STORED_FIELDS,
  STORED_CAPTURE_TYPE,
  STORED_ANCHOR,
  CAPTURE_UNION,
  CAPTURE_ORIGIN_MATCH,
  WRITE_NOTE,
  MARQUEE_END,
  MARQUEE_CLASSIFIER,
  SELECTION_ARM,
  READING_PLACE,
  RESUMED_CFI,
  ANCHOR_UNION,
  READ_SNAPSHOT,
  READ_STATE_OF,
  READ_QUERY,
  LANGUAGE,
  MODEL_FOOTPRINT,
  IMAGE_LAYOUT_KIND,
  TO_IMAGE_LAYOUT,
  MOVE_ORDER,
  DOCK_TOKENS,
  TAG_COLOURS_TAIL,
  REMEMBERED_SET,
  PDF_RENDER,
];

export {
  ANCHOR_UNION,
  BRANDED_IDS_SOURCE,
  CAPTURE_ORIGIN_MATCH,
  CAPTURE_UNION,
  DOCK_TOKENS,
  IMAGE_INDEX,
  IMAGE_LAYOUT_KIND,
  LANGUAGE,
  MARQUEE_CLASSIFIER,
  MARQUEE_END,
  MINTED_IDS,
  MODEL_FOOTPRINT,
  MOVE_ORDER,
  PDF_RENDER,
  READING_PLACE,
  READ_QUERY,
  READ_SNAPSHOT,
  READ_STATE_OF,
  REMEMBERED_SET,
  RESUMED_CFI,
  SCREEN_TO_IMAGE,
  SELECTION_ARM,
  SPACE_RECT,
  STORED_ANCHOR,
  STORED_CAPTURE_TYPE,
  STORED_FIELDS,
  TAG_COLOURS_TAIL,
  TO_IMAGE_LAYOUT,
  TYPE_SNIPPETS,
  WRITE_NOTE,
};
