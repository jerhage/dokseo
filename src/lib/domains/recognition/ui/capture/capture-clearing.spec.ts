import { describe, expect, it, vi } from 'vitest';
import type { QueryClient } from '@tanstack/svelte-query';
import { regionAnchor } from '$lib/shared/anchor';
import { pageRect } from '$lib/shared/geometry';
import type { BookCapturesExporting } from '$lib/shared/book-captures-export.svelte';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import { recognizedText } from '../../domain/engine/recognized-text';
import type { CaptureWrites } from '../../queries/capture-queries';
import { CaptureCache } from './capture-cache';
import { CaptureList } from './capture-list.svelte';
import { READ } from './capture-read';
import { CaptureClearing } from './capture-clearing.svelte';
import type { PanelCapture } from './panel-capture';

vi.mock('$lib/shared/write-query.svelte', () => import('$lib/shared/testing/unrun-write-query'));

const ONE = bookId('book-one');

const ANCHOR = regionAnchor([{ index: imageIndex(1), rect: pageRect(0, 0, 0.04, 0.02) }]);

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

function opened(asked: BookId[] = []): { list: CaptureList; clearing: CaptureClearing } {
  const list = new CaptureList(() => ({
    state: READ,
    captures: [],
    tags: [],
    unreadable: [],
    reload: () => undefined,
  }));
  list.open(ONE);
  const clearing = new CaptureClearing(
    {
      exportBookCaptures: (id: BookId) => {
        asked.push(id);
        return Promise.resolve({ kind: 'nothing-to-export' });
      },
    } as CaptureWrites & BookCapturesExporting,
    () => undefined,
    list,
    new CaptureCache({} as QueryClient),
  );
  return { list, clearing };
}

describe('CaptureClearing', () => {
  it('reports the notes it would delete as the scope of the clear', () => {
    const { list, clearing } = opened();
    list.unsaved.put(written('one'));

    expect(clearing.scope).toEqual({ kind: 'notes', notes: 1 });
  });

  it('prepares the export of the open book', () => {
    const asked: BookId[] = [];
    const { clearing } = opened(asked);

    clearing.prepareExport();

    expect(asked).toEqual([ONE]);
    expect(clearing.capturesExport.state).toEqual({ kind: 'preparing' });
  });
});
