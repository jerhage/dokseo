import { describe, expect, it } from 'vitest';
import { catalogId } from '$lib/shared/ids';
import { createTestQueryClient } from '$lib/shared/testing/query-client';
import { HOME_ROOT_FEED, HOME_SEARCH } from '../domain/catalog-feed-fixtures';
import { catalogKeys } from '../queries/catalog-keys';
import { createFeedReadings } from './feed-readings.svelte';
import { started } from './navigation';

const HOME = catalogId('home');

describe('createFeedReadings', () => {
  it('reads the cached first page of a place and nothing for a place not cached', () => {
    const client = createTestQueryClient();
    const readings = createFeedReadings(client);
    const place = started('home', () => 'p1').places.get('p1')!;

    expect(readings.of(HOME, place)).toBeUndefined();

    client.setQueryData(catalogKeys.feed(HOME, { kind: 'root' }), {
      pages: [HOME_ROOT_FEED],
      pageParams: [null],
    });

    expect(readings.of(HOME, place)).toEqual({ kind: 'ready', search: HOME_SEARCH });
  });
});
