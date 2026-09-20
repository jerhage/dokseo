import { describe, expect, it } from 'vitest';
import type { Container } from '$lib/container';
import { err, ok } from '$lib/shared/result';
import { accountOf, type StorageAccount, type StoragePart } from '../domain/storage-parts';
import {
  allowanceNote,
  measuredFigure,
  partFigure,
  persistenceNote,
  StorageSettingsView,
  unnamedFigure,
  unnamedNote,
} from './storage-view.svelte';

const MODEL: StoragePart = {
  key: 'model',
  label: 'manga-ocr base',
  detail: '7 files',
  bytes: 205_000_000,
};

const RECORDS: StoragePart = {
  key: 'records',
  label: 'Book records',
  detail: 'no size is reported',
  bytes: null,
};

function account(parts: readonly StoragePart[], usage: number | null): StorageAccount {
  return accountOf(parts, usage === null ? null : { usage, quota: 11_133_000_000 }, false);
}

function containerReading(read: Container['storage']['readStorageAccount']): Container {
  return { storage: { readStorageAccount: read } } as unknown as Container;
}

describe('partFigure', () => {
  it('says a part cannot be measured rather than printing a zero', () => {
    expect(partFigure(RECORDS)).toBe('not measurable');
    expect(partFigure(MODEL)).toBe('205 MB');
  });
});

describe('unnamedFigure', () => {
  it('names the bytes the parts do not explain', () => {
    expect(unnamedFigure(account([MODEL], 395_000_000))).toBe('190 MB');
  });

  it('reports nothing unnamed when the browser gives no total', () => {
    expect(unnamedFigure(account([MODEL], null))).toBeNull();
  });
});

describe('unnamedNote', () => {
  it('points at the parts that cannot be measured when there are some', () => {
    expect(unnamedNote(account([MODEL, RECORDS], 395_000_000))).toContain('cannot be measured');
  });

  it('claims nothing about unmeasured parts when every part was measured', () => {
    const note = unnamedNote(account([MODEL], 395_000_000));

    expect(note).toBe('bytes this app cannot name');
  });

  it('says every byte is named when the parts sum to the total', () => {
    expect(unnamedNote(account([MODEL], 205_000_000))).toBe(
      'every byte the browser counts is named above',
    );
  });

  it('says the parts overshoot when they come to more than the browser reports', () => {
    expect(unnamedNote(account([MODEL], 200_000_000))).toContain('more than the browser reports');
  });
});

describe('measuredFigure', () => {
  it('leaves an unmeasurable part out of the measured total', () => {
    expect(measuredFigure(account([MODEL, RECORDS], 395_000_000))).toBe('205 MB');
  });
});

describe('allowanceNote', () => {
  it('says what the browser allows when it reports a quota', () => {
    expect(allowanceNote(account([MODEL], 395_000_000))).toContain('11133 MB');
  });
});

describe('persistenceNote', () => {
  it('warns that the browser may reclaim the space without a grant', () => {
    expect(persistenceNote(account([MODEL], 395_000_000))).toContain('may reclaim');
  });
});

describe('StorageSettingsView', () => {
  it('holds the account the container reports', async () => {
    const read = account([MODEL], 395_000_000);
    const view = new StorageSettingsView(containerReading(() => Promise.resolve(ok(read))));

    await view.load();

    expect(view.account).toBe(read);
    expect(view.message).toBeNull();
  });

  it('reports why the survey failed and holds no account', async () => {
    const view = new StorageSettingsView(
      containerReading(() =>
        Promise.resolve(err({ kind: 'survey-failed' as const, cause: 'denied' })),
      ),
    );

    await view.load();

    expect(view.account).toBeNull();
    expect(view.message).toContain('denied');
  });

  it('reports a thrown failure rather than leaving the screen reading', async () => {
    const view = new StorageSettingsView(
      containerReading(() => Promise.reject(new Error('no storage manager'))),
    );

    await view.load();

    expect(view.message).toContain('no storage manager');
  });

  it('drops a reading that a dispose has abandoned', async () => {
    const view = new StorageSettingsView(
      containerReading(() => Promise.resolve(ok(account([MODEL], 1)))),
    );

    const reading = view.load();
    view.dispose();
    await reading;

    expect(view.account).toBeNull();
  });
});
