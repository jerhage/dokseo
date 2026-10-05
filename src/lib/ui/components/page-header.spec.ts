import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import PageHeader from './PageHeader.svelte';

const PAGE_HEADER = PageHeader as unknown as Component<Record<string, unknown>>;

function markup(props: Record<string, unknown>): string {
  return render(PAGE_HEADER, { props }).body.replaceAll(/<!--[^>]*-->/gu, '');
}

describe('PageHeader', () => {
  it('names the page with the title in its own language and follows it with the meta line', () => {
    const html = markup({ title: '月の本', lang: 'ja', meta: 'Japanese · 12 pages' });

    expect(html).toContain(
      '<div class="col gap-0 flex-1"><h1 class="text-base weight-medium truncate" lang="ja">月の本</h1> <p class="text-xs text-faint truncate">Japanese · 12 pages</p></div>',
    );
    expect(html).toMatch(/^<div class="page-header">/u);
    expect(html).not.toContain('<a');
  });

  it('leads with a labelled back link before the title', () => {
    const html = markup({ title: 'Book', backHref: '/', backLabel: 'Library' });

    expect(html.indexOf('href="/"')).toBeLessThan(html.indexOf('<h1'));
    expect(html).toMatch(/<a[^>]*href="\/"[^>]*>[\s\S]*Library[\s\S]*<\/a>/u);
    expect(html).not.toContain('visually-hidden');
  });

  it('shrinks the back link to an icon whose label is hidden text when compact', () => {
    const html = markup({ title: 'Book', backHref: '/', backLabel: 'Library', compact: true });

    expect(html).toContain('<span class="visually-hidden">Library</span>');
  });

  it('draws no meta line without a meta', () => {
    expect(markup({ title: 'Book' })).not.toContain('<p');
  });
});
