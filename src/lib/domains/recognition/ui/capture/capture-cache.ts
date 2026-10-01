import type { QueryClient } from '@tanstack/svelte-query';
import type { BookId, CaptureId } from '$lib/shared/ids';
import type { Capture } from '../../domain/capture/capture';
import type { Tag } from '../../domain/tag/tag';
import { recognitionKeys } from '../../queries/recognition-keys';
import type { StoreRead } from '../../queries/store-read';

type Listed = StoreRead<readonly Capture[]>;

type Named = StoreRead<readonly Tag[]>;

const NOTHING_HELD: readonly Capture[] = [];

function withTag(tags: readonly Tag[], tag: Tag): readonly Tag[] {
  return tags.some((held) => held.id === tag.id) ? tags : [...tags, tag];
}

function withCapture(listed: Listed | undefined, capture: Capture): Listed | undefined {
  if (listed?.kind !== 'read') return listed;

  const held = listed.value.some((row) => row.id === capture.id);
  const value = held
    ? listed.value.map((row) => (row.id === capture.id ? capture : row))
    : [...listed.value, capture];
  return { kind: 'read', value };
}

function withoutCapture(listed: Listed | undefined, id: CaptureId): Listed | undefined {
  if (listed?.kind !== 'read') return listed;

  return { kind: 'read', value: listed.value.filter((row) => row.id !== id) };
}

function withCaptures(
  listed: Listed | undefined,
  restored: readonly Capture[],
): Listed | undefined {
  if (listed?.kind !== 'read') return listed;

  const held = new Set(listed.value.map((row) => row.id));
  return {
    kind: 'read',
    value: [...restored.filter((row) => !held.has(row.id)), ...listed.value],
  };
}

function emptied(listed: Listed | undefined): Listed | undefined {
  if (listed?.kind !== 'read') return listed;

  return { kind: 'read', value: NOTHING_HELD };
}

function heldRows(listed: Listed | undefined): readonly Capture[] {
  return listed?.kind === 'read' ? listed.value : NOTHING_HELD;
}

function withNamed(named: Named | undefined, tag: Tag): Named | undefined {
  if (named?.kind !== 'read') return named;

  return { kind: 'read', value: withTag(named.value, tag) };
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
