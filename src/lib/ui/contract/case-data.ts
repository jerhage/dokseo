import type { CarouselSlide } from '../components/carousel';
import type { ComboboxOption } from '../components/combobox';
import type { DiagramBox, DiagramEdge, DiagramGroup, DiagramNode } from '../components/diagram';
import type { FileItemData } from '../components/file-item';
import type { HighlightSegment } from '../components/highlight';
import type { KeyHint } from '../components/key-hints';
import type { SegmentOption } from '../components/segmented-control';
import type { ContentsEntry } from '../components/table-of-contents';
import type { TabItem } from '../components/tabs';
import { Toaster } from '../components/toaster.svelte';
import type { Toast, ToastOptions } from '../components/toaster.svelte';

type ShownToast = { readonly toast: Toast; readonly toaster: Toaster };

function shownToast(options: ToastOptions): ShownToast {
  const toaster = new Toaster();
  toaster.show(options);
  const [toast] = toaster.toasts;
  if (toast === undefined) throw new Error(`The toaster shows no toast for ${options.title}`);
  return { toast, toaster };
}

function clearedToaster(blockEnd: number): Toaster {
  const toaster = new Toaster();
  toaster.reserveBlockEnd(blockEnd);
  return toaster;
}

const TOASTS = {
  info: shownToast({ title: 'Saved', variant: 'info' }),
  success: shownToast({ title: 'Saved', variant: 'success' }),
  warning: shownToast({ title: 'Saved', variant: 'warning' }),
  danger: shownToast({ title: 'Saved', variant: 'danger' }),
  message: shownToast({
    title: 'Saved',
    message: 'Your notes are on this device.',
    variant: 'success',
  }),
  timed: shownToast({ title: 'Saved', duration: 8000 }),
  action: shownToast({ title: 'Book removed', action: { label: 'Undo', run: () => {} } }),
} as const;

const REGION_TOASTER = new Toaster();

const CLEARED_TOASTER = clearedToaster(48);

const TABS: readonly TabItem[] = [
  { id: 'books', label: 'Books' },
  { id: 'notes', label: 'Notes' },
  { id: 'tags', label: 'Tags' },
];

const TABS_WITH_DISABLED: readonly TabItem[] = [
  { id: 'books', label: 'Books' },
  { id: 'notes', label: 'Notes', disabled: true },
  { id: 'tags', label: 'Tags' },
];

const ENTRIES: readonly ContentsEntry[] = [
  { id: 'setup', href: '#setup', title: 'Setup', level: 2 },
  { id: 'fonts', href: '#fonts', title: 'Fonts', level: 3 },
  { id: 'themes', href: '#themes', title: 'Themes', level: 2 },
];

const SOURCE: DiagramBox = { kind: 'box', label: 'Source', x: 20, y: 40, width: 120, height: 48 };

const STORE: DiagramBox = {
  kind: 'box',
  label: 'Store',
  detail: 'local',
  tone: 'primary',
  x: 220,
  y: 40,
  width: 120,
  height: 48,
};

const VIEW: DiagramBox = {
  kind: 'box',
  label: 'View',
  tone: 'accent',
  x: 220,
  y: 160,
  width: 120,
  height: 48,
};

const GROUP: DiagramGroup = {
  kind: 'group',
  label: 'App',
  tone: 'primary',
  x: 200,
  y: 10,
  width: 160,
  height: 220,
};

const NODES: readonly DiagramNode[] = [GROUP, SOURCE, STORE, VIEW];

const EDGES: readonly DiagramEdge[] = [
  { from: SOURCE, to: STORE, label: 'writes' },
  { from: STORE, to: VIEW },
];

const SLIDES: readonly CarouselSlide[] = [
  { key: 'one', beside: -1 },
  { key: 'two', beside: 0 },
  { key: 'three', beside: 1 },
];

const FILES = {
  pending: { id: 'a', name: 'notes.txt', size: 2048, state: 'pending' },
  uploading: { id: 'b', name: 'cover.png', size: 524288, state: 'uploading', progress: 40 },
  complete: { id: 'c', name: 'book.epub', size: 1048576, state: 'complete' },
  error: {
    id: 'd',
    name: 'big.zip',
    size: 99999999,
    state: 'error',
    message: 'The file is too large',
  },
} as const satisfies Readonly<Record<string, FileItemData>>;

const OPTIONS: readonly SegmentOption<string>[] = [
  { value: 'grid', label: 'Grid' },
  { value: 'list', label: 'List' },
  { value: 'table', label: 'Table' },
];

const OPTIONS_WITH_DISABLED: readonly SegmentOption<string>[] = [
  { value: 'grid', label: 'Grid' },
  { value: 'list', label: 'List', disabled: true },
  { value: 'table', label: 'Table' },
];

const HINTS: readonly KeyHint[] = [
  { keys: ['Ctrl', 'K'], does: 'search' },
  { keys: ['Esc'], does: 'close' },
];

const LANGUAGES: readonly ComboboxOption[] = [
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'en', label: 'English' },
];

const NAMES: readonly string[] = ['Ada', 'Grace', 'Linus', 'Margaret', 'Ken'];

type ShelfBook = { readonly title: string; readonly pages: number };

const SHELF_BOOK: ShelfBook = { title: 'Moby Dick', pages: 635 };

const SEGMENTS: readonly HighlightSegment[] = [
  { text: 'The ', matched: false },
  { text: 'quick', matched: true },
  { text: ' fox', matched: false },
];

export {
  CLEARED_TOASTER,
  EDGES,
  ENTRIES,
  FILES,
  HINTS,
  LANGUAGES,
  NAMES,
  NODES,
  OPTIONS,
  OPTIONS_WITH_DISABLED,
  REGION_TOASTER,
  SEGMENTS,
  SHELF_BOOK,
  SLIDES,
  SOURCE,
  TABS,
  TABS_WITH_DISABLED,
  TOASTS,
};
export type { ShelfBook };
