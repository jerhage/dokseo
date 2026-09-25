import { createRawSnippet } from 'svelte';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import SettingsShell from './SettingsShell.svelte';

const SHELL = SettingsShell as unknown as Component<Record<string, unknown>>;

const BODY = createRawSnippet(() => ({ render: () => '<p>Body</p>' }));
const ASIDE = createRawSnippet(() => ({ render: () => '<p>Aside</p>' }));

function markup(props: Record<string, unknown>): string {
  return render(SHELL, { props: { children: BODY, ...props } }).body;
}

function navCurrent(html: string): readonly string[] {
  return [
    ...html.matchAll(/<a[^>]*href="([^"]*)"[^>]*aria-current="page"[^>]*class="nav-link/gu),
  ].map((found) => found[1] ?? '');
}

function mainClasses(html: string): string {
  return /<main class="([^"]*)"/u.exec(html)?.[1] ?? '';
}

describe('SettingsShell', () => {
  it('marks only the current section as the current page', () => {
    expect(navCurrent(markup({ current: 'storage' }))).toEqual(['/settings/storage']);
    expect(navCurrent(markup({ current: 'engine' }))).toEqual(['/settings']);
    expect(navCurrent(markup({ current: 'appearance' }))).toEqual(['/settings/appearance']);
  });

  it('links every section beneath the root it is given', () => {
    const html = markup({ current: 'engine', root: '/elsewhere/settings' });

    expect(html).toContain('href="/elsewhere/settings"');
    expect(html).toContain('href="/elsewhere/settings/storage"');
    expect(html).toContain('href="/elsewhere/settings/appearance"');
  });

  it('names the current section last in the breadcrumb', () => {
    const html = markup({ current: 'storage' });

    expect(html).toContain('<span aria-current="page">Storage</span>');
  });

  it('keeps the library mark and the way back to the library', () => {
    const html = markup({ current: 'engine' });

    expect(html).toContain('aria-label="Your library"');
    expect(html).toContain('<a href="/">Library</a>');
  });

  it('renders the aside only when one is given', () => {
    expect(markup({ current: 'engine' })).not.toContain('Aside');
    expect(markup({ current: 'engine', aside: ASIDE })).toContain('<p>Aside</p>');
  });

  it('drops the main padding only for a flush page', () => {
    expect(mainClasses(markup({ current: 'engine', flush: true }))).toContain('p-0');
    expect(mainClasses(markup({ current: 'storage' }))).not.toContain('p-0');
  });

  it('lets a script focus the main area without adding it to the tab order', () => {
    expect(markup({ current: 'storage' })).toMatch(/<main [^>]*tabindex="-1"/u);
  });
});
