import { describe, expect, it } from 'vitest';
import type { CatalogDraft } from '../domain/catalog-draft';
import { CALIBRE_ROOT, HTML_PAGE, SPEC_CONFORMING_ACQUISITION } from '../domain/opds-fixtures';
import type { CatalogCredentials, OpdsClient, ReadFeedResult } from '../domain/opds-client';
import { testCatalogConnection } from './test-catalog-connection';

const OPEN: CatalogDraft = {
  title: '',
  rootUrl: 'https://example.org/opds',
  auth: { kind: 'none' },
};
const PRIVATE: CatalogDraft = {
  title: '',
  rootUrl: 'https://example.org/opds',
  auth: { kind: 'basic', username: 'jo' },
};

function setup(answer: ReadFeedResult) {
  const requests: { url: string; credentials: CatalogCredentials }[] = [];
  const client: OpdsClient = {
    readFeed: (url, credentials) => {
      requests.push({ url, credentials });
      return Promise.resolve(answer);
    },
    readImage: () => Promise.reject(new Error('unused')),
    download: () => Promise.reject(new Error('unused')),
  };
  return { requests, deps: { client } };
}

describe('testCatalogConnection', () => {
  it('reports the title of a navigation root feed without needing a name', async () => {
    const { deps, requests } = setup({ kind: 'success', text: CALIBRE_ROOT });
    const result = await testCatalogConnection(deps, OPEN, null);
    expect(result).toEqual({
      kind: 'success',
      feedTitle: 'Sample Library',
      feedKind: 'navigation',
    });
    expect(requests).toEqual([{ url: 'https://example.org/opds', credentials: { kind: 'none' } }]);
  });

  it('reports the title of an acquisition root feed', async () => {
    const { deps } = setup({ kind: 'success', text: SPEC_CONFORMING_ACQUISITION });
    const result = await testCatalogConnection(deps, OPEN, null);
    expect(result.kind).toBe('success');
    if (result.kind === 'success') expect(result.feedKind).toBe('acquisition');
  });

  it('sends the typed password with the username', async () => {
    const { deps, requests } = setup({ kind: 'success', text: CALIBRE_ROOT });
    await testCatalogConnection(deps, PRIVATE, 'secret');
    expect(requests[0]?.credentials).toEqual({ kind: 'basic', username: 'jo', password: 'secret' });
  });

  it('answers locked and sends nothing when basic has no password', async () => {
    const { deps, requests } = setup({ kind: 'success', text: CALIBRE_ROOT });
    expect(await testCatalogConnection(deps, PRIVATE, null)).toEqual({ kind: 'locked' });
    expect(requests).toEqual([]);
  });

  it('answers not-opds for a page that is no feed', async () => {
    const { deps } = setup({ kind: 'success', text: HTML_PAGE });
    expect(await testCatalogConnection(deps, OPEN, null)).toEqual({ kind: 'not-opds' });
  });

  it('passes each client failure through', async () => {
    const failures: ReadFeedResult[] = [
      { kind: 'unauthorized' },
      { kind: 'not-found' },
      { kind: 'server-error', status: 503 },
      { kind: 'blocked' },
      { kind: 'offline' },
      { kind: 'aborted' },
    ];
    for (const failure of failures) {
      const { deps } = setup(failure);
      expect(await testCatalogConnection(deps, OPEN, null)).toEqual(failure);
    }
  });

  it('refuses a draft with an unusable address without a request', async () => {
    const { deps, requests } = setup({ kind: 'success', text: CALIBRE_ROOT });
    const draft: CatalogDraft = { ...OPEN, rootUrl: 'http://example.org/opds' };
    expect(await testCatalogConnection(deps, draft, null)).toEqual({
      kind: 'invalid-url',
      problem: 'insecure',
    });
    expect(requests).toEqual([]);
  });

  it('refuses basic without a username', async () => {
    const { deps } = setup({ kind: 'success', text: CALIBRE_ROOT });
    const draft: CatalogDraft = { ...PRIVATE, auth: { kind: 'basic', username: ' ' } };
    expect(await testCatalogConnection(deps, draft, 'x')).toEqual({ kind: 'missing-username' });
  });
});
