import { NO_ERRORS, STRICT, STRICT_INDEXED } from './compiled-example';
import type { CompiledExample } from './compiled-example';

const BRANDED_IDS: CompiledExample = {
  file: 'brands.ts',
  flags: STRICT,
  code: `declare const brand: unique symbol;
type Branded<T, B extends string> = T & { readonly [brand]: B };

type BookId = Branded<string, 'BookId'>;
type TagId = Branded<string, 'TagId'>;

function tagId(value: string): TagId {
  return value as TagId;
}

function openBook(id: BookId): void {}

openBook(tagId('tag-7'));
openBook('tag-7');`,
  errors: `brands.ts(13,10): error TS2345: Argument of type 'TagId' is not assignable to parameter of type 'BookId'.
  Type 'TagId' is not assignable to type '{ readonly [brand]: "BookId"; }'.
    Types of property '[brand]' are incompatible.
      Type '"TagId"' is not assignable to type '"BookId"'.
brands.ts(14,10): error TS2345: Argument of type 'string' is not assignable to parameter of type 'BookId'.
  Type 'string' is not assignable to type '{ readonly [brand]: "BookId"; }'.`,
};

const COMPARED_BRANDS: CompiledExample = {
  file: 'compared.ts',
  flags: STRICT,
  code: `declare const brand: unique symbol;
type Branded<T, B extends string> = T & { readonly [brand]: B };

type BookId = Branded<string, 'BookId'>;
type TagId = Branded<string, 'TagId'>;

declare const book: BookId;
declare const tag: TagId;

const same = book === tag;`,
  errors: `compared.ts(10,14): error TS2367: This comparison appears to be unintentional because the types 'BookId' and 'TagId' have no overlap.`,
};

const INDEX_ARITHMETIC: CompiledExample = {
  file: 'index-math.ts',
  flags: STRICT,
  code: `declare const brand: unique symbol;
type Branded<T, B extends string> = T & { readonly [brand]: B };

type ImageIndex = Branded<number, 'ImageIndex'>;

declare function imageIndex(value: number): ImageIndex;

const shown: ImageIndex = imageIndex(12);
const next: ImageIndex = shown + 1;
const minted: ImageIndex = imageIndex(shown + 1);`,
  errors: `index-math.ts(9,7): error TS2322: Type 'number' is not assignable to type 'ImageIndex'.
  Type 'number' is not assignable to type '{ readonly [brand]: "ImageIndex"; }'.`,
};

const COVARIANT_SPACE: CompiledExample = {
  file: 'covariant.ts',
  flags: STRICT,
  code: `declare const space: unique symbol;

type Rect<S extends string> = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly [space]: S;
};

declare function clampTo<S extends string>(r: Rect<S>, bounds: Rect<S>): Rect<S>;
declare const selection: Rect<'screen'>;
declare const page: Rect<'image'>;

clampTo(selection, page);`,
  errors: NO_ERRORS,
};

const INVARIANT_SPACE: CompiledExample = {
  file: 'invariant.ts',
  flags: STRICT,
  code: `declare const space: unique symbol;

type Rect<in out S extends string> = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly [space]: (s: S) => S;
};

declare function clampTo<S extends string>(r: Rect<S>, bounds: Rect<S>): Rect<S>;
declare const selection: Rect<'screen'>;
declare const page: Rect<'image'>;

clampTo(selection, page);`,
  errors: `invariant.ts(15,9): error TS2345: Argument of type 'Rect<"screen">' is not assignable to parameter of type 'Rect<"screen" | "image">'.
  Types of property '[space]' are incompatible.
    Type '(s: "screen") => "screen"' is not assignable to type '(s: "screen" | "image") => "screen" | "image"'.
      Types of parameters 's' and 's' are incompatible.
        Type '"screen" | "image"' is not assignable to type '"screen"'.
          Type '"image"' is not assignable to type '"screen"'.`,
};

const GENERIC_IDS: CompiledExample = {
  file: 'generic-ids.ts',
  flags: STRICT,
  code: `declare const brand: unique symbol;
type Branded<T, B extends string> = T & { readonly [brand]: B };

type BookId = Branded<string, 'BookId'>;
type TagId = Branded<string, 'TagId'>;

declare function sameId<B extends string>(one: Branded<string, B>, other: Branded<string, B>): boolean;
declare const book: BookId;
declare const tag: TagId;

sameId(book, tag);`,
  errors: NO_ERRORS,
};

const ANNOTATED_TOKENS: CompiledExample = {
  file: 'annotated.ts',
  flags: STRICT,
  code: `type DockDetent = 'standard' | 'tall';

const DOCK_DETENT_TOKENS: Record<DockDetent, string> = {
  standard: '--layout-sheet-height',
  tall: '--layout-sheet-height-tall',
};

const token: '--layout-sheet-height' = DOCK_DETENT_TOKENS.standard;`,
  errors: `annotated.ts(8,7): error TS2322: Type 'string' is not assignable to type '"--layout-sheet-height"'.`,
};

const SATISFIED_TOKENS: CompiledExample = {
  file: 'satisfied.ts',
  flags: STRICT,
  code: `type DockDetent = 'standard' | 'tall';

const DOCK_DETENT_TOKENS = {
  standard: '--layout-sheet-height',
} as const satisfies Record<DockDetent, \`--\${string}\`>;`,
  errors: `satisfied.ts(5,12): error TS1360: Type '{ readonly standard: "--layout-sheet-height"; }' does not satisfy the expected type 'Record<DockDetent, \`--\${string}\`>'.
  Property 'tall' is missing in type '{ readonly standard: "--layout-sheet-height"; }' but required in type 'Record<DockDetent, \`--\${string}\`>'.`,
};

const LIST_SATISFIES: CompiledExample = {
  file: 'colours.ts',
  flags: STRICT_INDEXED,
  code: `type TagColour = 'slate' | 'clay' | 'sage';

const TAG_COLOURS = ['slate', 'clay'] as const satisfies readonly TagColour[];
const FIRST_TAG_COLOUR: TagColour = TAG_COLOURS[0];

const ANNOTATED: readonly TagColour[] = ['slate', 'clay'];
const FIRST_ANNOTATED: TagColour = ANNOTATED[0];`,
  errors: `colours.ts(7,7): error TS2322: Type 'TagColour | undefined' is not assignable to type 'TagColour'.
  Type 'undefined' is not assignable to type 'TagColour'.`,
};

const DERIVED_UNION: CompiledExample = {
  file: 'derived.ts',
  flags: STRICT_INDEXED,
  code: `const TAG_COLOURS = ['slate', 'clay', 'sage'] as const;

type TagColour = (typeof TAG_COLOURS)[number];

const FIRST_TAG_COLOUR: TagColour = TAG_COLOURS[0];
const TEAL: TagColour = 'teal';`,
  errors: `derived.ts(6,7): error TS2322: Type '"teal"' is not assignable to type '"slate" | "clay" | "sage"'.`,
};

const SHALLOW_READONLY: CompiledExample = {
  file: 'shallow.ts',
  flags: STRICT,
  code: `type Capture = {
  readonly text: string;
  readonly tagIds: string[];
};

function tag(capture: Capture, tag: string): void {
  capture.tagIds.push(tag);
}`,
  errors: NO_ERRORS,
};

const READONLY_LIST: CompiledExample = {
  file: 'deeper.ts',
  flags: STRICT,
  code: `type Capture = {
  readonly text: string;
  readonly tagIds: readonly string[];
};

function tag(capture: Capture, tag: string): void {
  capture.tagIds.push(tag);
}

function tagged(capture: Capture, tag: string): Capture {
  return { ...capture, tagIds: [...capture.tagIds, tag] };
}`,
  errors: `deeper.ts(7,18): error TS2339: Property 'push' does not exist on type 'readonly string[]'.`,
};

const ALIASED_READONLY: CompiledExample = {
  file: 'aliased.ts',
  flags: STRICT,
  code: `type Place = { index: number };
type ReadonlyPlace = { readonly index: number };

const place: Place = { index: 12 };
const shown: ReadonlyPlace = place;

place.index = 13;`,
  errors: NO_ERRORS,
};

const ANY_ROW: CompiledExample = {
  file: 'any.ts',
  flags: STRICT,
  code: `const row = JSON.parse('{"title": 214}');

const title: string = row.title.trim();`,
  errors: NO_ERRORS,
};

const UNKNOWN_ROW: CompiledExample = {
  file: 'unknown.ts',
  flags: STRICT,
  code: `const row: unknown = JSON.parse('{"title": 214}');

const title: string = row.title.trim();`,
  errors: `unknown.ts(3,23): error TS18046: 'row' is of type 'unknown'.`,
};

const PARSED_ROW: CompiledExample = {
  file: 'parsed.ts',
  flags: STRICT,
  code: `type StoredFields = { readonly [field: string]: unknown };

function isStoredFields(value: unknown): value is StoredFields {
  return typeof value === 'object' && value !== null;
}

function storedTitle(row: unknown): string {
  if (!isStoredFields(row)) throw new Error('A stored book is not an object');
  if (typeof row.title !== 'string') throw new Error('A stored book lacks its title');
  return row.title.trim();
}`,
  errors: NO_ERRORS,
};

const CLAIMED_ROW: CompiledExample = {
  file: 'claimed.ts',
  flags: STRICT,
  code: `type Book = { readonly title: string; readonly imageCount: number };

const book = JSON.parse('{"title": 214}') as Book;
const shout = book.title.toUpperCase();`,
  errors: NO_ERRORS,
};

const IMPOSSIBLE_ASSERTION: CompiledExample = {
  file: 'impossible.ts',
  flags: STRICT,
  code: `const count = 'many' as number;`,
  errors: `impossible.ts(1,15): error TS2352: Conversion of type 'string' to type 'number' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.`,
};

const DOUBLE_ASSERTION: CompiledExample = {
  file: 'double.ts',
  flags: STRICT,
  code: `const count = 'many' as unknown as number;`,
  errors: NO_ERRORS,
};

const OFFSCREEN_CONTEXT: CompiledExample = {
  file: 'render-context.ts',
  flags: STRICT,
  code: `type RenderParameters = {
  canvas: HTMLCanvasElement | null;
  canvasContext?: CanvasRenderingContext2D | undefined;
};

declare function render(parameters: RenderParameters): void;

const context = new OffscreenCanvas(100, 100).getContext('2d');
if (context === null) throw new Error('A 2D drawing context was unavailable');

render({ canvas: null, canvasContext: context });`,
  errors: `render-context.ts(11,24): error TS2739: Type 'OffscreenCanvasRenderingContext2D' is missing the following properties from type 'CanvasRenderingContext2D': getContextAttributes, drawFocusIfNeeded`,
};

const TOOL_EXAMPLES: readonly CompiledExample[] = [
  BRANDED_IDS,
  COMPARED_BRANDS,
  INDEX_ARITHMETIC,
  COVARIANT_SPACE,
  INVARIANT_SPACE,
  GENERIC_IDS,
  ANNOTATED_TOKENS,
  SATISFIED_TOKENS,
  LIST_SATISFIES,
  DERIVED_UNION,
  SHALLOW_READONLY,
  READONLY_LIST,
  ALIASED_READONLY,
  ANY_ROW,
  UNKNOWN_ROW,
  PARSED_ROW,
  CLAIMED_ROW,
  IMPOSSIBLE_ASSERTION,
  DOUBLE_ASSERTION,
  OFFSCREEN_CONTEXT,
];

export {
  ALIASED_READONLY,
  ANNOTATED_TOKENS,
  ANY_ROW,
  BRANDED_IDS,
  CLAIMED_ROW,
  COMPARED_BRANDS,
  COVARIANT_SPACE,
  DERIVED_UNION,
  DOUBLE_ASSERTION,
  GENERIC_IDS,
  IMPOSSIBLE_ASSERTION,
  INDEX_ARITHMETIC,
  INVARIANT_SPACE,
  LIST_SATISFIES,
  OFFSCREEN_CONTEXT,
  PARSED_ROW,
  READONLY_LIST,
  SATISFIED_TOKENS,
  SHALLOW_READONLY,
  TOOL_EXAMPLES,
  UNKNOWN_ROW,
};
