import { createRawSnippet } from 'svelte';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { accountOf } from '../domain/storage-parts';
import type { StorageAccount } from '../domain/storage-parts';
import StorageData from './StorageData.svelte';

const DATA = StorageData as unknown as Component<Record<string, unknown>>;

const ACCOUNT = accountOf(
  [{ key: 'model', label: 'manga-ocr base', detail: '7 files', bytes: 205_000_000 }],
  { usage: 395_000_000, quota: 11_133_000_000 },
  true,
);

const MEASURED = createRawSnippet((account: () => StorageAccount) => ({
  render: () => `<p>measured ${account().measured}</p>`,
}));

function markup(state: unknown): string {
  return render(DATA, { props: { state, children: MEASURED } }).body;
}

describe('StorageData', () => {
  it('renders no child while the account is read', () => {
    const html = markup({ kind: 'loading' });

    expect(html).toContain('Reading what is stored…');
    expect(html).not.toContain('measured');
  });

  it('renders the failure in place of the child', () => {
    const html = markup({ kind: 'failed', message: 'denied' });

    expect(html).toContain('Storage could not be read');
    expect(html).toContain('denied');
    expect(html).not.toContain('measured');
  });

  it('hands the child the account once it is read', () => {
    expect(markup({ kind: 'ready', value: ACCOUNT, refresh: { kind: 'settled' } })).toContain(
      '<p>measured 205000000</p>',
    );
  });
});
