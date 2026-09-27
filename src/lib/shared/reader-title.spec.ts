import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import ReaderTitle from './ReaderTitle.svelte';

describe('ReaderTitle', () => {
  it('names the page with the title in its own language and follows it with the meta line', () => {
    const html = render(ReaderTitle as Component<Record<string, unknown>>, {
      props: { title: '月の本', lang: 'ja', meta: 'Japanese · 12 pages' },
    }).body.replaceAll(/<!--[^>]*-->/gu, '');

    expect(html).toBe(
      '<div class="col gap-0 flex-1"><h1 class="text-base weight-medium truncate" lang="ja">月の本</h1> <p class="text-xs text-faint truncate">Japanese · 12 pages</p></div>',
    );
  });
});
