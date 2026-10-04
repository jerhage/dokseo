import { isNumber, isText, knownStoredValue } from '$lib/shared/corrupt-row';
import { tagId } from '$lib/shared/ids';
import type { TagId } from '$lib/shared/ids';
import { foldForSearch } from '$lib/shared/text-search';
import { isTagColour } from './tag-colour';
import type { TagColour } from './tag-colour';

type Tag = {
  readonly id: TagId;
  readonly name: string;
  readonly colour: TagColour;
  readonly createdAt: number;
};

type StoredTag = { readonly [Field in keyof Tag]?: unknown };

type UnreadableTag = { readonly id: TagId; readonly name: string | null };

type StoredTags = {
  readonly tags: readonly Tag[];
  readonly unreadable: readonly UnreadableTag[];
};

const INNER_SPACE = /\s+/gu;

function tagName(raw: string): string {
  return raw.trim().normalize('NFC').replaceAll(INNER_SPACE, ' ');
}

function namedTag(id: TagId, name: string, colour: TagColour, createdAt: number): Tag {
  return { id, name: tagName(name), colour, createdAt };
}

function renamedTag(tag: Tag, name: string): Tag {
  return { ...tag, name: tagName(name) };
}

function recolouredTag(tag: Tag, colour: TagColour): Tag {
  return { ...tag, colour };
}

function tagField<T>(field: string, value: unknown, known: (value: unknown) => value is T): T {
  return knownStoredValue('tag', field, value, known);
}

function isKey(value: unknown): value is string {
  return isText(value) && value.length > 0;
}

function isTagName(value: unknown): value is string {
  return isText(value) && tagName(value).length > 0;
}

function tagFromStored(stored: StoredTag): Tag {
  return {
    id: tagId(tagField('id', stored.id, isKey)),
    name: tagField('name', stored.name, isTagName),
    colour: tagField('colour', stored.colour, isTagColour),
    createdAt: tagField('created time', stored.createdAt, isNumber),
  };
}

function unreadableTag(row: StoredTag, cause: unknown): UnreadableTag {
  if (typeof row.id !== 'string' || row.id.length === 0) throw cause;
  return { id: tagId(row.id), name: typeof row.name === 'string' ? row.name : null };
}

function tagsFromStored(rows: readonly StoredTag[]): StoredTags {
  const tags: Tag[] = [];
  const unreadable: UnreadableTag[] = [];
  for (const row of rows) {
    try {
      tags.push(tagFromStored(row));
    } catch (cause) {
      unreadable.push(unreadableTag(row, cause));
    }
  }
  return { tags, unreadable };
}

function byName(tags: readonly Tag[]): readonly Tag[] {
  return tags.toSorted((earlier, later) => earlier.name.localeCompare(later.name));
}

function sameTagName(left: string, right: string): boolean {
  return foldForSearch(tagName(left)).text === foldForSearch(tagName(right)).text;
}

export {
  tagName,
  namedTag,
  renamedTag,
  recolouredTag,
  tagFromStored,
  tagsFromStored,
  byName,
  sameTagName,
};
export type { Tag, StoredTag, StoredTags, UnreadableTag };
