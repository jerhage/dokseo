import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import SettingsSectionList from './SettingsSectionList.svelte';

const LIST = SettingsSectionList as unknown as Component<Record<string, unknown>>;

function markup(props: Record<string, unknown> = {}): string {
  return render(LIST, { props }).body;
}

function listLinks(html: string): readonly string[] {
  const list = /<nav[^>]*aria-label="Settings sections"[^>]*>([\s\S]*?)<\/nav>/u.exec(html)?.[1];

  return [...(list ?? '').matchAll(/<a[^>]*>/gu)].map((found) => found[0]);
}

describe('SettingsSectionList', () => {
  it('links every section to its own page, the OCR engine included', () => {
    const hrefs = listLinks(markup()).map((link) => /href="([^"]*)"/u.exec(link)?.[1]);

    expect(hrefs).toEqual([
      '/settings/engine',
      '/settings/storage',
      '/settings/data',
      '/settings/appearance',
      '/settings/library',
      '/settings/catalogs',
      '/settings/reading',
      '/settings/app',
    ]);
  });

  it('draws every section link in the full text colour and marks none as current', () => {
    const links = listLinks(markup());

    expect(links).toHaveLength(8);
    expect(links.every((link) => /class="nav-link nav-link-strong\b/u.test(link))).toBe(true);
    expect(links.some((link) => link.includes('aria-current'))).toBe(false);
  });

  it('keeps each summary faint beneath its name, both cut short with an ellipsis', () => {
    expect(markup()).toMatch(
      /<span class="truncate">Your data<\/span>\s*<span class="truncate text-xs text-faint weight-normal">Export and import captures<\/span>/u,
    );
  });
});
