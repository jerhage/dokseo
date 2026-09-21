import { foldForSearch } from '$lib/shared/text-search';
import type { TagId } from '$lib/shared/ids';
import { FIRST_TAG_COLOUR } from './tag-colour';
import type { TagColour } from './tag-colour';

type Tag = {
  readonly id: TagId;
  readonly name: string;
  readonly colour: TagColour;
  readonly createdAt: number;
};

type StoredTag = Omit<Tag, 'colour' | 'createdAt'> & {
  readonly colour?: TagColour;
  readonly createdAt?: number | null;
};

const INNER_SPACE = /\s+/gu;

function tagName(raw: string): string {
  return raw.trim().normalize('NFC').replaceAll(INNER_SPACE, ' ');
}

function namedTag(id: TagId, name: string, colour: TagColour, createdAt: number): Tag {
  return { id, name: tagName(name), colour, createdAt };
}

function tagFromStored(stored: StoredTag): Tag {
  return {
    ...stored,
    colour: stored.colour ?? FIRST_TAG_COLOUR,
    createdAt: stored.createdAt ?? 0,
  };
}

function oldestFirst(tags: readonly Tag[]): readonly Tag[] {
  return tags.toSorted((earlier, later) => earlier.createdAt - later.createdAt);
}

function sameTagName(left: string, right: string): boolean {
  return foldForSearch(tagName(left)).text === foldForSearch(tagName(right)).text;
}

export { tagName, namedTag, tagFromStored, oldestFirst, sameTagName };
export type { Tag, StoredTag };
