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

function currentLinks(html: string): readonly string[] {
  return [...html.matchAll(/<a[^>]*href="([^"]*)"[^>]*aria-current="page"/gu)].map(
    (found) => found[1] ?? '',
  );
}

describe('SettingsShell', () => {
  it('marks only the current section as the current page', () => {
    expect(currentLinks(markup({ current: 'storage' }))).toEqual(['/settings/storage']);
    expect(currentLinks(markup({ current: 'engine' }))).toEqual(['/settings']);
  });

  it('links both sections beneath the root it is given', () => {
    const html = markup({ current: 'engine', root: '/preview/a/settings' });

    expect(html).toContain('href="/preview/a/settings"');
    expect(html).toContain('href="/preview/a/settings/storage"');
  });

  it('keeps the library mark and the way back to the library', () => {
    const html = markup({ current: 'engine' });

    expect(html).toContain('aria-label="Your library"');
    expect(html).toContain('Back to your library');
  });

  it('renders the aside only when one is given', () => {
    expect(markup({ current: 'engine' })).not.toContain('Aside');
    expect(markup({ current: 'engine', aside: ASIDE })).toContain('<p>Aside</p>');
  });
});
