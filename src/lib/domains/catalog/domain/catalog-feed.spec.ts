import { describe, expect, it } from 'vitest';
import { HOME_ROOT_FEED, HOME_SERIES_FEED } from './catalog-feed-fixtures';
import type { FeedPage } from './catalog-feed';

describe('FeedPage', () => {
  it('narrows its items by its kind', () => {
    const pages: readonly FeedPage[] = [HOME_ROOT_FEED, HOME_SERIES_FEED];

    const titles = pages.map((page) =>
      page.kind === 'navigation'
        ? page.items.map((entry) => entry.link.title)
        : page.items.map((entry) => entry.publication.title),
    );

    expect(titles[0]).toEqual(['By Newest', 'By Series']);
    expect(titles[1]).toEqual(['星の旅 2', 'Star Voyage 3']);
  });
});
