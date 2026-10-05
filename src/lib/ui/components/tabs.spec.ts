import { createRawSnippet } from 'svelte';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { shownTab } from './tabs';
import Tabs from './Tabs.svelte';

const TABS_COMPONENT = Tabs as unknown as Component<Record<string, unknown>>;

const NOTHING = createRawSnippet(() => ({ render: () => '<span></span>' }));

const TABS = [
  { id: 'billing', label: 'Billing', disabled: true },
  { id: 'overview', label: 'Overview' },
  { id: 'activity', label: 'Activity' },
];

describe('shownTab', () => {
  it('shows the selected tab', () => {
    expect(shownTab(TABS, 'activity')).toBe('activity');
  });

  it.each([
    ['when nothing is selected', undefined],
    ['in place of a selection that names no tab', 'gone'],
  ])('shows the first enabled tab %s', (_case, selected) => {
    expect(shownTab(TABS, selected)).toBe('overview');
  });

  it('refuses to show a disabled tab even when it is selected', () => {
    expect(shownTab(TABS, 'billing')).toBe('overview');
  });

  it('shows nothing when every tab is disabled', () => {
    expect(shownTab([{ id: 'a', label: 'A', disabled: true }], 'a')).toBeUndefined();
  });
});

describe('Tabs', () => {
  it('puts the caller class on the root, not on the header that holds the tab list and the actions', () => {
    const html = render(TABS_COMPONENT, {
      props: {
        tabs: [{ id: 'all', label: 'All' }],
        label: 'Shelves',
        class: 'narrow-row',
        actions: NOTHING,
        panel: NOTHING,
      },
    }).body;

    expect(html).toMatch(/class="tabs narrow-row"/u);
    expect(html).toMatch(/class="tabs-header"/u);
  });
});
