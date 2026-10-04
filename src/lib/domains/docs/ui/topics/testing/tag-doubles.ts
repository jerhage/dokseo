import { match } from 'ts-pattern';
import { nextColour } from '$lib/domains/recognition/domain/tag/tag-colour';
import { namedTag, sameTagName, tagName } from '$lib/domains/recognition/domain/tag/tag';
import type { Tag } from '$lib/domains/recognition/domain/tag/tag';
import type { TagListing, TagRepository } from '$lib/domains/recognition/domain/tag/tag-repository';
import { createTag } from '$lib/domains/recognition/use-cases/tag/create-tag';
import type {
  CreateTagDeps,
  CreateTagResult,
} from '$lib/domains/recognition/use-cases/tag/create-tag';
import { tagId } from '$lib/shared/ids';
import type { TagId } from '$lib/shared/ids';
import { runCheck } from '../../../domain/spec-runner';
import type { CheckOutcome } from '../../../domain/spec-runner';

type CreateVersion = 'real' | 'lists-twice' | 'case-sensitive';

type DoubleKind = 'fake' | 'mock';

type CreateTagFunction = (deps: CreateTagDeps, id: TagId, name: string) => Promise<CreateTagResult>;

type DoubleTest = {
  readonly double: DoubleKind;
  readonly name: string;
  readonly outcome: CheckOutcome;
  readonly calls: readonly string[];
};

const NOW = () => 7;

const CREATE_VERSIONS: readonly { readonly value: CreateVersion; readonly label: string }[] = [
  { value: 'real', label: 'createTag as written' },
  { value: 'lists-twice', label: 'A refactor that lists twice' },
  { value: 'case-sensitive', label: 'A bug: names compared with ===' },
];

async function createTagListingTwice(
  deps: CreateTagDeps,
  id: TagId,
  name: string,
): Promise<CreateTagResult> {
  const named = await deps.tags.list();
  if (named.kind !== 'success') return named;

  const taken = named.tags.find((tag) => sameTagName(tag.name, name));
  if (taken !== undefined) return { kind: 'name-taken', tag: taken };

  const coloured = await deps.tags.list();
  if (coloured.kind !== 'success') return coloured;

  const tag = namedTag(id, name, nextColour(coloured.tags), deps.now());
  const stored = await deps.tags.save(tag);
  if (stored.kind !== 'success') return stored;

  return { kind: 'success', tag };
}

async function createTagCaseSensitive(
  deps: CreateTagDeps,
  id: TagId,
  name: string,
): Promise<CreateTagResult> {
  const existing = await deps.tags.list();
  if (existing.kind !== 'success') return existing;

  const taken = existing.tags.find((tag) => tag.name === tagName(name));
  if (taken !== undefined) return { kind: 'name-taken', tag: taken };

  const tag = namedTag(id, name, nextColour(existing.tags), deps.now());
  const stored = await deps.tags.save(tag);
  if (stored.kind !== 'success') return stored;

  return { kind: 'success', tag };
}

function versionOf(version: CreateVersion): CreateTagFunction {
  return match(version)
    .with('real', () => createTag)
    .with('lists-twice', () => createTagListingTwice)
    .with('case-sensitive', () => createTagCaseSensitive)
    .exhaustive();
}

function fakeTags(calls: string[]): TagRepository & { readonly held: Tag[] } {
  const held: Tag[] = [];
  return {
    held,
    list(): Promise<TagListing> {
      calls.push('list()');
      return Promise.resolve({ kind: 'success', tags: [...held], unreadable: [] });
    },
    save(tag) {
      calls.push(`save(${tag.name})`);
      const index = held.findIndex((other) => other.id === tag.id);
      if (index === -1) held.push(tag);
      else held[index] = tag;
      return Promise.resolve({ kind: 'success' });
    },
    remove(id) {
      calls.push(`remove(${id})`);
      return Promise.resolve({ kind: 'success' });
    },
  };
}

function mockTags(scripted: readonly Tag[], calls: string[]): TagRepository {
  return {
    list(): Promise<TagListing> {
      calls.push('list()');
      return Promise.resolve({ kind: 'success', tags: scripted, unreadable: [] });
    },
    save(tag) {
      calls.push(`save(${tag.name})`);
      return Promise.resolve({ kind: 'success' });
    },
    remove(id) {
      calls.push(`remove(${id})`);
      return Promise.resolve({ kind: 'success' });
    },
  };
}

const GRAMMAR = namedTag(tagId('tag-grammar'), 'Grammar', 'slate', 1);

async function fakeListsCreated(create: CreateTagFunction): Promise<DoubleTest> {
  const calls: string[] = [];
  const tags = fakeTags(calls);
  await create({ tags, now: NOW }, tagId('tag-new'), 'Grammar');
  const listed = await tags.list();
  const names = listed.kind === 'success' ? listed.tags.map((tag) => tag.name) : [];
  return {
    double: 'fake',
    name: 'returns a created tag from the next list',
    outcome: runCheck(() => names, ['Grammar']),
    calls,
  };
}

async function fakeRefusesOtherCase(create: CreateTagFunction): Promise<DoubleTest> {
  const calls: string[] = [];
  const tags = fakeTags(calls);
  await create({ tags, now: NOW }, tagId('tag-first'), 'Grammar');
  const second = await create({ tags, now: NOW }, tagId('tag-second'), 'grammar');
  return {
    double: 'fake',
    name: 'refuses a second tag whose name differs only in case',
    outcome: runCheck(() => [second.kind, tags.held.length], ['name-taken', 1]),
    calls,
  };
}

async function mockListsOnceSavesOnce(create: CreateTagFunction): Promise<DoubleTest> {
  const calls: string[] = [];
  await create({ tags: mockTags([], calls), now: NOW }, tagId('tag-new'), 'Grammar');
  return {
    double: 'mock',
    name: 'calls list once, then save once with the new tag',
    outcome: runCheck(() => calls, ['list()', 'save(Grammar)']),
    calls,
  };
}

async function mockSavesNothingWhenTaken(create: CreateTagFunction): Promise<DoubleTest> {
  const calls: string[] = [];
  await create({ tags: mockTags([GRAMMAR], calls), now: NOW }, tagId('tag-new'), 'grammar');
  return {
    double: 'mock',
    name: 'calls only list when the scripted list holds the name',
    outcome: runCheck(() => calls, ['list()']),
    calls,
  };
}

async function runDoubleTests(version: CreateVersion): Promise<readonly DoubleTest[]> {
  const create = versionOf(version);
  const fakeListed = await fakeListsCreated(create);
  const fakeRefused = await fakeRefusesOtherCase(create);
  const mockCounted = await mockListsOnceSavesOnce(create);
  const mockTaken = await mockSavesNothingWhenTaken(create);
  return [fakeListed, fakeRefused, mockCounted, mockTaken];
}

function isCreateVersion(value: string): value is CreateVersion {
  return CREATE_VERSIONS.some((version) => version.value === value);
}

export { CREATE_VERSIONS, isCreateVersion, runDoubleTests, versionOf };
export type { CreateVersion, DoubleKind, DoubleTest };
