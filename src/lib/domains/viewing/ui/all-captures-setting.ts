import { rememberedString } from '$lib/platform/storage/remembered-string';
import type { LocateStore } from '$lib/platform/storage/remembered-string';

const ALL_CAPTURES_KEY = 'reader.captures.all';

const ALL_CAPTURES_LABEL = 'Show all captures';

function toAllCaptures(stored: string | null): boolean {
  return stored === 'on';
}

function readAllCaptures(locate?: LocateStore): boolean {
  return toAllCaptures(rememberedString(ALL_CAPTURES_KEY, locate).read());
}

function saveAllCaptures(wanted: boolean, locate?: LocateStore): void {
  rememberedString(ALL_CAPTURES_KEY, locate).write(wanted ? 'on' : 'off');
}

export { ALL_CAPTURES_KEY, ALL_CAPTURES_LABEL, readAllCaptures, saveAllCaptures, toAllCaptures };
