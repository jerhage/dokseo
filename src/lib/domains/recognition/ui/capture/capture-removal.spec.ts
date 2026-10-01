import { describe, expect, it } from 'vitest';
import type { Container } from '$lib/container';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import type { Notice } from '$lib/shared/notice';
import { ok } from '$lib/shared/result';
import type { Capture } from '../../domain/capture/capture';
import { CaptureList } from './capture-list.svelte';
import { CaptureRemoval } from './capture-removal.svelte';

const ONE = bookId('book-one');

const TWO = bookId('book-two');

const STORED: Capture = {
  id: captureId('kept'),
  bookId: ONE,
  anchor: regionAnchor([{ index: imageIndex(1), rect: imageRect(0, 0, 40, 20) }]),
  text: '先',
  note: null,
  confidence: null,
  origin: 'recognized',
  createdAt: 1,
  editedAt: null,
  tagIds: [],
};

describe('CaptureRemoval', () => {
  it('raises no Undo for a removal the store answers after another book opened', async () => {
    const answers: (() => void)[] = [];
    const notices: Notice[] = [];
    const container = {
      recognition: {
        listCaptures: () => Promise.resolve(ok([STORED])),
        listTags: () => Promise.resolve(ok([])),
        removeCapture: () => new Promise((resolve) => answers.push(() => resolve(ok(undefined)))),
      },
    } as unknown as Container;
    const list = new CaptureList(container, () => undefined);
    await list.open(ONE);
    const removal = new CaptureRemoval(container, (notice) => notices.push(notice), list);

    const removing = removal.remove(STORED.id);
    await list.open(TWO);
    for (const answer of answers) answer();

    expect(await removing).toBe('saved');
    expect(notices).toEqual([]);
  });
});
