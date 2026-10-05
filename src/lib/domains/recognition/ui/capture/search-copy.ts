import type { KeyHint } from '$lib/ui/components/key-hints';
import type { SearchFilter } from '../../domain/capture/quick-find';
import type { SearchScope } from './search-rows';
import type { CaptureFind } from './capture-find';

type SearchNote =
  | { readonly kind: 'none' }
  | { readonly kind: 'unread' }
  | { readonly kind: 'nothing'; readonly message: string };

type SearchRoom = 'wide' | 'narrow';

type SearchNoteInput = {
  readonly read: CaptureFind;
  readonly query: string;
  readonly rows: number;
  readonly filter: SearchFilter;
  readonly scope: SearchScope;
};

const NO_NOTE: SearchNote = { kind: 'none' };

const CAPTURES_UNREAD: SearchNote = { kind: 'unread' };

const CAPTURES_UNREAD_MESSAGE = 'Your captures could not be read.';

const PALETTE_KEYS: readonly KeyHint[] = [
  { keys: ['↑↓'], does: 'move' },
  { keys: ['↵'], does: 'jump to result' },
  { keys: ['⌘↵'], does: 'new tab' },
  { keys: ['esc'], does: 'close' },
];

function searchesTitles(filter: SearchFilter, scope: SearchScope): boolean {
  return filter !== 'tags' && scope === 'all';
}

function searchInvite(filter: SearchFilter, scope: SearchScope, room: SearchRoom): string {
  if (filter === 'tags') return 'Find a tag';

  const titled = searchesTitles(filter, scope);
  if (room === 'narrow') return titled ? 'Titles, text, tags, notes' : 'Text, tags, notes';

  return titled ? 'Find in titles, text, tags and notes' : 'Find in text, tags and notes';
}

function searchNothing(filter: SearchFilter, scope: SearchScope): string {
  if (filter === 'tags') return 'No capture carries a tag of that name.';

  return searchesTitles(filter, scope)
    ? 'No title or capture holds that text.'
    : 'No capture holds that text.';
}

function searchNote(input: SearchNoteInput): SearchNote {
  if (input.read.kind === 'failed') return CAPTURES_UNREAD;
  if (input.rows > 0 || input.query.trim().length === 0) return NO_NOTE;

  return { kind: 'nothing', message: searchNothing(input.filter, input.scope) };
}

function resultCount(count: number): string {
  return `${count} ${count === 1 ? 'result' : 'results'}`;
}

export {
  CAPTURES_UNREAD_MESSAGE,
  PALETTE_KEYS,
  searchInvite,
  searchNote,
  searchNothing,
  resultCount,
};
export type { SearchNote, SearchNoteInput, SearchRoom };
