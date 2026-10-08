import { catalogId } from '$lib/shared/ids';
import { checkedDraft } from '../domain/catalog-draft';
import type { CatalogDraft, DraftRefusal } from '../domain/catalog-draft';
import type { CatalogCredentials, ClientFailure, OpdsClient } from '../domain/opds-client';
import { readOpdsFeed } from '../domain/opds-feed';

type TestedFeedKind = 'navigation' | 'acquisition';

type TestCatalogConnectionResult =
  | { readonly kind: 'success'; readonly feedTitle: string; readonly feedKind: TestedFeedKind }
  | { readonly kind: 'not-opds' }
  | { readonly kind: 'locked' }
  | DraftRefusal
  | ClientFailure;

type TestCatalogConnectionDeps = { readonly client: OpdsClient };

const TESTED_CATALOG = catalogId('connection-test');
const TESTED_TITLE = 'connection test';

async function testCatalogConnection(
  deps: TestCatalogConnectionDeps,
  draft: CatalogDraft,
  password: string | null,
  signal?: AbortSignal,
): Promise<TestCatalogConnectionResult> {
  const checked = checkedDraft({ ...draft, title: TESTED_TITLE });
  if (checked.kind !== 'valid') return checked;

  const auth = checked.draft.auth;
  let credentials: CatalogCredentials = { kind: 'none' };
  if (auth.kind === 'basic') {
    if (password === null) return { kind: 'locked' };
    credentials = { kind: 'basic', username: auth.username, password };
  }

  const rootUrl = checked.draft.rootUrl;
  const fetched = await deps.client.readFeed(rootUrl, credentials, signal);
  if (fetched.kind !== 'success') return fetched;

  const reading = readOpdsFeed(fetched.text, rootUrl, TESTED_CATALOG, []);
  if (reading.kind === 'not-a-feed') return { kind: 'not-opds' };
  return { kind: 'success', feedTitle: reading.feed.title, feedKind: reading.kind };
}

export { testCatalogConnection };
export type { TestCatalogConnectionDeps, TestCatalogConnectionResult, TestedFeedKind };
