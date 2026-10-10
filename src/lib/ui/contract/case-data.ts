import type { CarouselSlide } from '../components/carousel';
import type { ComboboxOption } from '../components/combobox';
import type {
  DiagramBox,
  DiagramEdge,
  DiagramGroup,
  DiagramNode,
  DiagramTone,
} from '../components/diagram';
import type { FileItemData } from '../components/file-item';
import type { HighlightSegment } from '../components/highlight';
import type { KeyHint } from '../components/key-hints';
import type { PacketRow } from '../components/packet';
import type { SegmentOption } from '../components/segmented-control';
import type { SequenceParticipant, SequenceStep } from '../components/sequence';
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

function toneNodes(): readonly DiagramNode[] {
  const tones: readonly DiagramTone[] = ['success', 'warning', 'danger'];
  return tones.flatMap((tone, index): readonly DiagramNode[] => {
    const label = `${tone.slice(0, 1).toUpperCase()}${tone.slice(1)}`;
    const left = 10 + index * 160;
    return [
      { kind: 'group', label, tone, x: left, y: 10, width: 140, height: 110 },
      { kind: 'box', label, tone, x: left + 10, y: 50, width: 120, height: 48 },
    ];
  });
}

const TONE_NODES: readonly DiagramNode[] = toneNodes();

const TARGET: DiagramBox = { kind: 'box', label: 'Target', x: 220, y: 40, width: 120, height: 48 };

const SINK: DiagramBox = { kind: 'box', label: 'Sink', x: 220, y: 40, width: 120, height: 48 };

const PEER_A: DiagramBox = { kind: 'box', label: 'Peer A', x: 20, y: 40, width: 120, height: 48 };

const PEER_B: DiagramBox = { kind: 'box', label: 'Peer B', x: 220, y: 40, width: 120, height: 48 };

const ACTIVE_BOX: DiagramBox = {
  kind: 'box',
  label: 'Active',
  emphasis: 'active',
  x: 220,
  y: 40,
  width: 120,
  height: 48,
};

const ROUTE_SOURCE: DiagramBox = {
  kind: 'box',
  label: 'Source',
  x: 20,
  y: 20,
  width: 120,
  height: 48,
};

const ROUTE_TARGET: DiagramBox = {
  kind: 'box',
  label: 'Target',
  x: 220,
  y: 140,
  width: 120,
  height: 48,
};

const WIDE_SOURCE: DiagramBox = { ...SOURCE, tone: 'primary' };

const WIDE_STORE: DiagramBox = {
  kind: 'box',
  label: 'Store',
  x: 520,
  y: 40,
  width: 120,
  height: 48,
};

const HANDSHAKE_PARTICIPANTS: readonly SequenceParticipant[] = [
  { label: 'Client', tone: 'primary' },
  { label: 'Server', tone: 'accent' },
  { label: 'Authority' },
];

const HANDSHAKE_STEPS: readonly SequenceStep[] = [
  { kind: 'message', from: 0, to: 1, label: 'ClientHello' },
  { kind: 'message', from: 1, to: 0, label: 'ServerHello, Certificate' },
  { kind: 'message', from: 0, to: 2, label: 'Check the certificate' },
  { kind: 'message', from: 2, to: 0, label: 'Valid', dashed: true },
  { kind: 'message', from: 0, to: 0, label: 'Derive the session keys' },
  { kind: 'note', from: 0, to: 1, text: 'Both sides now hold the session keys' },
  { kind: 'message', from: 0, to: 1, label: 'Finished' },
  { kind: 'message', from: 1, to: 0, label: 'Finished', dashed: true },
];

const PACKET_OFFSETS: readonly number[] = [0, 8, 16, 24];

const PACKET_ROWS: readonly PacketRow[] = [
  [
    { name: 'Version', detail: '4 bits', span: 4, tone: 'primary' },
    { name: 'Header length', detail: '4 bits', span: 4, tone: 'primary' },
    { name: 'Flags', detail: '8 bits', span: 8, tone: 'accent' },
    { name: 'Total length', detail: '16 bits', span: 16 },
  ],
  [
    { name: 'Identification', detail: '16 bits', span: 16 },
    { name: 'Fragment', detail: '3 bits', span: 3, tone: 'warning' },
    { name: 'Offset', detail: '13 bits', span: 13, tone: 'warning' },
  ],
  [
    { name: 'Lifetime', detail: '8 bits', span: 8, tone: 'success' },
    { name: 'Protocol', detail: '8 bits', span: 8 },
    { name: 'Checksum', detail: '16 bits', span: 16, tone: 'danger' },
  ],
  [{ name: 'Source address', detail: '32 bits', span: 32 }],
  [{ name: 'Destination address', detail: '32 bits', span: 32 }],
  [{ name: 'Options', detail: 'variable', span: 32 }],
];

const PAIR: readonly SequenceParticipant[] = [{ label: 'Client' }, { label: 'Server' }];

const ROUTE_CAPTIONS: readonly string[] = [
  'The client hands the packet to the router.',
  'The router looks up where the packet goes next.',
  'The server receives the packet.',
];

const HANDSHAKE_CAPTIONS: readonly string[] = [
  'The client opens by saying which versions it speaks.',
  'The server answers with its certificate so the client can check who it is talking to.',
  'The client confirms the handshake.',
  'The server confirms it too.',
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
  ACTIVE_BOX,
  CLEARED_TOASTER,
  EDGES,
  ENTRIES,
  FILES,
  HANDSHAKE_CAPTIONS,
  HANDSHAKE_PARTICIPANTS,
  HANDSHAKE_STEPS,
  HINTS,
  LANGUAGES,
  NAMES,
  NODES,
  OPTIONS,
  OPTIONS_WITH_DISABLED,
  PACKET_OFFSETS,
  PACKET_ROWS,
  PAIR,
  PEER_A,
  PEER_B,
  REGION_TOASTER,
  ROUTE_CAPTIONS,
  ROUTE_SOURCE,
  ROUTE_TARGET,
  SEGMENTS,
  SHELF_BOOK,
  SINK,
  SLIDES,
  SOURCE,
  TABS,
  TABS_WITH_DISABLED,
  TARGET,
  TONE_NODES,
  TOASTS,
  WIDE_SOURCE,
  WIDE_STORE,
};
export type { ShelfBook };
