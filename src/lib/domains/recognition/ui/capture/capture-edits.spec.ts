import { describe, expect, it, vi } from 'vitest';
import type { QueryClient } from '@tanstack/svelte-query';
import { regionAnchor } from '$lib/shared/anchor';
import { pageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import type { Notice } from '$lib/shared/notice';
import type { Capture } from '../../domain/capture/capture';
import { recognizedText } from '../../domain/engine/recognized-text';
import type { CaptureWrites } from '../../queries/capture-queries';
import { CaptureCache } from './capture-cache';
import { CaptureEdits, NOTE_NOT_SAVED, TEXT_NOT_SAVED } from './capture-edits.svelte';
import { READ } from './capture-read';
import { panelCapturesOf, storedIn } from './capture-list-rules';
import type { CaptureLookup } from './capture-list-rules';
import type { PanelCapture } from './panel-capture';

vi.mock('$lib/shared/write-query.svelte', () => import('$lib/shared/testing/unrun-write-query'));

const ONE = bookId('book-one');

const ANCHOR = regionAnchor([{ index: imageIndex(1), rect: pageRect(0, 0, 0.04, 0.02) }]);

const WRITTEN: Capture = {
  id: captureId('written'),
  bookId: ONE,
  anchor: ANCHOR,
  text: 'mine',
  origin: 'written',
  createdAt: 2,
  editedAt: null,
  tagIds: [],
};

function opened(unsaved: readonly PanelCapture[] = []): {
  edits: CaptureEdits;
  lookup: CaptureLookup;
  notices: Notice[];
} {
  const notices: Notice[] = [];
  const listing = {
    state: READ,
    captures: [WRITTEN],
    tags: [],
    unreadable: [],
    reload: () => undefined,
  };
  const edits = new CaptureEdits(
    {} as CaptureWrites,
    (notice) => notices.push(notice),
    new CaptureCache({} as QueryClient),
  );
  const lookup: CaptureLookup = {
    cards: panelCapturesOf(listing, unsaved),
    stored: (id) => storedIn(listing, id),
  };
  return { edits, lookup, notices };
}

describe('CaptureEdits', () => {
  it('writes no note onto a written note', async () => {
    const { edits, lookup, notices } = opened();

    expect(await edits.annotate(WRITTEN.id, 'a note', lookup)).toBe('saved');
    expect(notices).toEqual([]);
  });

  it('refuses the text of a card the store never held, before any write', async () => {
    const { edits, lookup, notices } = opened([
      {
        id: captureId('lifted'),
        anchor: ANCHOR,
        origin: 'lifted',
        note: null,
        tagIds: [],
        status: 'done',
        text: recognizedText('海', null),
        edited: false,
      },
    ]);

    expect(await edits.edit(captureId('lifted'), '山', lookup)).toBe('failed');
    expect(notices).toEqual([
      { tone: 'danger', title: TEXT_NOT_SAVED, message: 'This capture is not in storage.' },
    ]);
  });

  it('refuses the note of a card the store never held, before any write', async () => {
    const { edits, lookup, notices } = opened([
      {
        id: captureId('read'),
        anchor: ANCHOR,
        origin: 'recognized',
        note: null,
        tagIds: [],
        status: 'done',
        text: recognizedText('海', null),
        edited: false,
      },
    ]);

    expect(await edits.annotate(captureId('read'), 'the sea', lookup)).toBe('failed');
    expect(notices.map((notice) => notice.title)).toEqual([NOTE_NOT_SAVED]);
  });
});
