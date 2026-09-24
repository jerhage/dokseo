import type { PaletteFilter } from '../../domain/capture/quick-find';
import type { PaletteScope } from './palette-rows';

const PALETTE_KEYS = '↑↓ move · ↵ jump to result · ⌘↵ new tab · esc close';

function searchesTitles(filter: PaletteFilter, scope: PaletteScope): boolean {
  return filter !== 'tags' && scope === 'all';
}

function paletteInvite(filter: PaletteFilter, scope: PaletteScope): string {
  if (filter === 'tags') return 'Find a tag';

  return searchesTitles(filter, scope)
    ? 'Find in titles, text, tags and notes'
    : 'Find in text, tags and notes';
}

function paletteNothing(filter: PaletteFilter, scope: PaletteScope): string {
  if (filter === 'tags') return 'No capture carries a tag of that name.';

  return searchesTitles(filter, scope)
    ? 'No title or capture holds that text.'
    : 'No capture holds that text.';
}

function resultCount(count: number): string {
  return `${count} ${count === 1 ? 'result' : 'results'}`;
}

export { PALETTE_KEYS, paletteInvite, paletteNothing, resultCount };
