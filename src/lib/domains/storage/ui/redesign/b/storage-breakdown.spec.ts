import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { accountOf } from '../../../domain/storage-parts';
import type { StorageAccount, StoragePart } from '../../../domain/storage-parts';
import StorageBreakdown from './StorageBreakdown.svelte';

const MODEL: StoragePart = {
  key: 'model',
  label: 'manga-ocr base',
  detail: '7 files',
  bytes: 205_000_000,
};

const BOOKS: StoragePart = {
  key: 'books',
  label: 'Books and their covers',
  detail: '12 files',
  bytes: 480_000_000,
};

const RECORDS: StoragePart = {
  key: 'records',
  label: 'Book records',
  detail: 'no size is reported',
  bytes: null,
};

const BREAKDOWN = StorageBreakdown as unknown as Component<Record<string, unknown>>;

function markup(usage: number | null): string {
  const shown: StorageAccount = accountOf(
    [MODEL, BOOKS, RECORDS],
    usage === null ? null : { usage, quota: 11_133_000_000 },
    true,
  );
  return render(BREAKDOWN, { props: { account: shown } }).body;
}

function count(html: string, text: string): number {
  return html.split(text).length - 1;
}

describe('StorageBreakdown', () => {
  it('draws a share for every sized row and none for a part that cannot be measured', () => {
    const html = markup(900_000_000);

    expect(count(html, 'role="progressbar"')).toBe(3);
    expect(html).not.toContain('aria-label="Book records, share of the space used"');
  });

  it('lists the largest part first', () => {
    const html = markup(null);

    expect(html.indexOf('Books and their covers')).toBeLessThan(html.indexOf('manga-ocr base'));
  });

  it('names the measured total and the browser total when the browser reports one', () => {
    const html = markup(900_000_000);

    expect(html).toContain('Measured above');
    expect(html).toContain('Counted by the browser for this app');
    expect(html).toContain('Other browser storage');
  });

  it('leaves out every figure that needs the browser total when there is none', () => {
    const html = markup(null);

    expect(html).toContain('Measured above');
    expect(html).not.toContain('Counted by the browser for this app');
    expect(html).not.toContain('Other browser storage');
  });
});
