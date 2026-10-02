import { describe, expect, it, vi } from 'vitest';
import type { QueryClient } from '@tanstack/svelte-query';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import { recognizedText } from '../../domain/engine/recognized-text';
import type { CaptureWrites } from '../../queries/capture-queries';
import { CaptureCache } from './capture-cache';
import { CaptureList } from './capture-list.svelte';
import { READ } from './capture-read';
import { ClearAll } from './clear-all.svelte';
import type { PanelCapture } from './panel-capture';

vi.mock('$lib/shared/write-query.svelte', () => import('$lib/shared/testing/unrun-write-query'));

const ONE = bookId('book-one');

const ANCHOR = regionAnchor([{ index: imageIndex(1), rect: imageRect(0, 0, 40, 20) }]);

function written(id: string): PanelCapture {
  return {
    id: captureId(id),
    anchor: ANCHOR,
    origin: 'written',
    tagIds: [],
    status: 'done',
    text: recognizedText(id, null),
    edited: false,
  };
}

function opened(): { list: CaptureList; clearing: ClearAll } {
  const list = new CaptureList(() => ({
    state: READ,
    captures: [],
    tags: [],
    unreadable: [],
    reload: () => undefined,
  }));
  list.open(ONE);
  const clearing = new ClearAll(
    {} as CaptureWrites,
    () => undefined,
    list,
    new CaptureCache({} as QueryClient),
  );
  return { list, clearing };
}

describe('ClearAll', () => {
  it('asks for no confirmation while the list holds no capture', () => {
    const { clearing } = opened();

    clearing.ask();

    expect(clearing.confirming).toBe(false);
  });

  it('asks for a confirmation of the notes it would delete, and drops it on dismiss', () => {
    const { list, clearing } = opened();
    list.unsaved.put(written('one'));

    clearing.ask();

    expect(clearing.confirming).toBe(true);
    expect(clearing.scope).toEqual({ kind: 'notes', notes: 1 });

    clearing.dismiss();

    expect(clearing.confirming).toBe(false);
  });

  it('closes the confirmation as the clear starts', () => {
    const { list, clearing } = opened();
    list.unsaved.put(written('one'));
    clearing.ask();

    void clearing.clear();

    expect(clearing.confirming).toBe(false);
  });
});
