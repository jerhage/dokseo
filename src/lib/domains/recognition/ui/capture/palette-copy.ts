import type { KeyHint } from '$lib/components/key-hints';
import type { PaletteFilter } from '../../domain/capture/quick-find';
import type { PaletteScope } from './palette-rows';
import type { CaptureSearchStatus } from './capture-search.svelte';

type PaletteNote =
  | { readonly kind: 'none' }
  | { readonly kind: 'unread' }
  | { readonly kind: 'nothing'; readonly message: string };

type PaletteRoom = 'wide' | 'narrow';

type PaletteNoteInput = {
  readonly status: CaptureSearchStatus;
  readonly query: string;
  readonly rows: number;
  readonly filter: PaletteFilter;
  readonly scope: PaletteScope;
};

const NO_NOTE: PaletteNote = { kind: 'none' };

const CAPTURES_UNREAD: PaletteNote = { kind: 'unread' };

const CAPTURES_UNREAD_MESSAGE = 'Your captures could not be read.';

const PALETTE_KEYS: readonly KeyHint[] = [
  { keys: ['↑↓'], does: 'move' },
  { keys: ['↵'], does: 'jump to result' },
  { keys: ['⌘↵'], does: 'new tab' },
  { keys: ['esc'], does: 'close' },
];

function searchesTitles(filter: PaletteFilter, scope: PaletteScope): boolean {
  return filter !== 'tags' && scope === 'all';
}

function paletteInvite(filter: PaletteFilter, scope: PaletteScope, room: PaletteRoom): string {
  if (filter === 'tags') return 'Find a tag';

  const titled = searchesTitles(filter, scope);
  if (room === 'narrow') return titled ? 'Titles, text, tags, notes' : 'Text, tags, notes';

  return titled ? 'Find in titles, text, tags and notes' : 'Find in text, tags and notes';
}

function paletteNothing(filter: PaletteFilter, scope: PaletteScope): string {
  if (filter === 'tags') return 'No capture carries a tag of that name.';

  return searchesTitles(filter, scope)
    ? 'No title or capture holds that text.'
    : 'No capture holds that text.';
}

function paletteNote(input: PaletteNoteInput): PaletteNote {
  if (input.status === 'failed') return CAPTURES_UNREAD;
  if (input.rows > 0 || input.query.trim().length === 0) return NO_NOTE;

  return { kind: 'nothing', message: paletteNothing(input.filter, input.scope) };
}

function resultCount(count: number): string {
  return `${count} ${count === 1 ? 'result' : 'results'}`;
}

export {
  CAPTURES_UNREAD_MESSAGE,
  PALETTE_KEYS,
  paletteInvite,
  paletteNote,
  paletteNothing,
  resultCount,
};
export type { PaletteNote, PaletteNoteInput, PaletteRoom };
