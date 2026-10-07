import type { Snippet } from 'svelte';
import type { ReadingSettings } from '$lib/domains/flowing/domain/reading-settings';
import type { SoughtPassage, TextQuote } from '$lib/shared/anchor';

type DemoInk = {
  readonly scheme: 'light' | 'dark';
  readonly text: string;
  readonly link: string;
  readonly selection: string;
  readonly selectionText: string;
};

type DemoRelocation = {
  readonly cfi: string;
  readonly fraction?: number;
  readonly cause: { readonly kind: 'travel' | 'reflow' };
};

type DemoOpening = {
  readonly source: Blob;
  readonly at: string | null;
  readonly settings: ReadingSettings;
  readonly ink: DemoInk;
  readonly moved: (at: DemoRelocation) => void;
};

type DemoCfis = {
  getCFI(index: number, range: Range): string;
};

type DemoTitles = {
  getProgressOf(
    index: number,
    range: Range,
  ): { readonly tocItem?: { readonly label?: string | null } | null };
};

type DemoChapter = {
  readonly doc: Document;
  readonly index: number;
  readonly cfis: DemoCfis;
  readonly titles: DemoTitles;
};

type DemoPaging =
  | { readonly axis: 'vertical'; readonly mode: 'vertical-rl' | 'vertical-lr' }
  | { readonly axis: 'horizontal'; readonly direction: 'ltr' | 'rtl' };

type DemoArrival =
  | { readonly kind: 'cfi'; readonly cfi: string }
  | { readonly kind: 'quote'; readonly cfi: string }
  | { readonly kind: 'collapsed-cfi'; readonly cfi: string }
  | { readonly kind: 'lost' };

type DemoMark =
  | { readonly kind: 'none' }
  | { readonly kind: 'arrived'; readonly cfi: string; readonly place: string | null };

type DemoPages = {
  prev(): unknown;
  next(): unknown;
};

type DemoSurface = {
  readonly pages: DemoPages;
  readonly paging: DemoPaging;
  jump(href: string): void;
  goToPassage(passage: SoughtPassage): Promise<DemoArrival>;
  mark(passages: readonly string[], arrived: DemoMark): void;
  restyle(settings: ReadingSettings, ink: DemoInk): void;
  destroy(): void;
};

type DemoPassage = {
  readonly cfi: string;
  readonly quote: TextQuote;
  readonly chapter: string | null;
};

type OpenFlow = (
  host: HTMLElement,
  opening: DemoOpening,
  bind: (chapter: DemoChapter) => void,
) => Promise<DemoSurface>;

type CapturePassage = (
  doc: Document,
  index: number,
  cfis: DemoCfis,
  titles: DemoTitles,
) => DemoPassage | null;

type InkProbe = Snippet<[(ink: DemoInk) => void]>;

type FlowKit = {
  readonly open: OpenFlow;
  readonly passage: CapturePassage;
  readonly ink: InkProbe;
};

export type {
  CapturePassage,
  DemoArrival,
  DemoChapter,
  DemoInk,
  DemoMark,
  DemoOpening,
  DemoPassage,
  DemoPaging,
  DemoRelocation,
  DemoSurface,
  FlowKit,
  InkProbe,
  OpenFlow,
};
