import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { accountOf } from '../../../domain/storage-parts';
import type { StorageAccount, StoragePart } from '../../../domain/storage-parts';
import StorageAccountCard from './StorageAccountCard.svelte';

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

const CARD = StorageAccountCard as unknown as Component<Record<string, unknown>>;

function account(usage: number | null): StorageAccount {
  return accountOf(
    [MODEL, RECORDS],
    usage === null ? null : { usage, quota: 11_133_000_000 },
    true,
  );
}

function markup(shown: StorageAccount, engineHref = '/settings'): string {
  return render(CARD, { props: { account: shown, engineHref } }).body;
}

function count(html: string, text: string): number {
  return html.split(text).length - 1;
}

describe('StorageAccountCard', () => {
  it('heads every row with a row header, so a screen reader names each figure', () => {
    const html = markup(account(395_000_000));

    expect(count(html, '<th scope="row"')).toBe(5);
    expect(count(html, '<td')).toBe(5);
  });

  it('shows the unnamed remainder and the browser total when the browser reports usage', () => {
    const html = markup(account(395_000_000));

    expect(html).toContain('Other browser storage');
    expect(html).toContain('Counted by the browser for this app');
    expect(html).toContain('The browser allows this app about');
  });

  it('leaves out every row and note that needs the browser total when there is none', () => {
    const html = markup(account(null));

    expect(html).not.toContain('Other browser storage');
    expect(html).not.toContain('Counted by the browser for this app');
    expect(html).not.toContain('The browser allows this app about');
    expect(count(html, '<th scope="row"')).toBe(3);
  });

  it('points the model removal note at the engine page it is given', () => {
    const html = markup(account(null), '/preview/a/settings');

    expect(html).toContain('href="/preview/a/settings"');
  });

  it('says whether the browser granted persistence', () => {
    expect(markup(account(null))).toContain('The browser has granted persistence');
  });
});
