import type { QueryClient } from '@tanstack/svelte-query';
import type { BookId, CaptureId } from '$lib/shared/ids';
import type { Capture } from '../../domain/capture/capture';
import type { Tag } from '../../domain/tag/tag';
import { recognitionKeys } from '../../queries/recognition-keys';
import type { ListCapturesResult } from '../../use-cases/capture/list-captures';
import type { ListTagsResult } from '../../use-cases/tag/list-tags';

type Listed = ListCapturesResult;

type Named = ListTagsResult;

const NOTHING_HELD: readonly Capture[] = [];

function withTag(tags: readonly Tag[], tag: Tag): readonly Tag[] {
  return tags.some((held) => held.id === tag.id) ? tags : [...tags, tag];
}

function withCapture(listed: Listed | undefined, capture: Capture): Listed | undefined {
  if (listed?.kind !== 'success') return listed;

  const held = listed.captures.some((row) => row.id === capture.id);
  const captures = held
    ? listed.captures.map((row) => (row.id === capture.id ? capture : row))
    : [...listed.captures, capture];
  return { ...listed, captures };
}

function withoutCapture(listed: Listed | undefined, id: CaptureId): Listed | undefined {
  if (listed?.kind !== 'success') return listed;

  return { ...listed, captures: listed.captures.filter((row) => row.id !== id) };
}

function withCaptures(
  listed: Listed | undefined,
  restored: readonly Capture[],
): Listed | undefined {
  if (listed?.kind !== 'success') return listed;

  const held = new Set(listed.captures.map((row) => row.id));
  return {
    ...listed,
    captures: [...restored.filter((row) => !held.has(row.id)), ...listed.captures],
  };
}

function emptied(listed: Listed | undefined): Listed | undefined {
  if (listed?.kind !== 'success') return listed;

  return { ...listed, captures: NOTHING_HELD };
}

function heldRows(listed: Listed | undefined): readonly Capture[] {
  return listed?.kind === 'success' ? listed.captures : NOTHING_HELD;
}

function withNamed(named: Named | undefined, tag: Tag): Named | undefined {
  if (named?.kind !== 'success') return named;

  return { kind: 'success', tags: withTag(named.tags, tag) };
}

class CaptureCache {
  #client: QueryClient;

  constructor(client: QueryClient) {
    this.#client = client;
  }

  cancel(book: BookId): Promise<void> {
    return this.#client.cancelQueries({ queryKey: recognitionKeys.captures(book) });
  }

  put(capture: Capture): void {
    this.#client.setQueryData<Listed>(recognitionKeys.captures(capture.bookId), (listed) =>
      withCapture(listed, capture),
    );
  }

  holds(capture: Capture): boolean {
    const listed = this.#client.getQueryData<Listed>(recognitionKeys.captures(capture.bookId));
    return heldRows(listed).some((row) => row.id === capture.id);
  }

  drop(capture: Capture): void {
    this.#client.setQueryData<Listed>(recognitionKeys.captures(capture.bookId), (listed) =>
      withoutCapture(listed, capture.id),
    );
  }

  empty(book: BookId): readonly Capture[] {
    const queryKey = recognitionKeys.captures(book);
    const held = heldRows(this.#client.getQueryData<Listed>(queryKey));
    this.#client.setQueryData<Listed>(queryKey, emptied);
    return held;
  }

  restore(book: BookId, rows: readonly Capture[]): void {
    this.#client.setQueryData<Listed>(recognitionKeys.captures(book), (listed) =>
      withCaptures(listed, rows),
    );
  }

  name(tag: Tag): void {
    this.#client.setQueryData<Named>(recognitionKeys.tags(), (named) => withNamed(named, tag));
  }

  async refresh(book: BookId): Promise<void> {
    await Promise.all([
      this.#client.invalidateQueries({ queryKey: recognitionKeys.captures(book) }),
      this.refreshEveryCapture(),
    ]);
  }

  refreshEveryCapture(): Promise<void> {
    return this.#client.invalidateQueries({ queryKey: recognitionKeys.everyCapture() });
  }

  refreshTags(): Promise<void> {
    return this.#client.invalidateQueries({ queryKey: recognitionKeys.tags() });
  }
}

export {
  CaptureCache,
  emptied,
  heldRows,
  withCapture,
  withCaptures,
  withNamed,
  withTag,
  withoutCapture,
};
