import type { FeedHead } from '../domain/catalog-feed';
import type { FeedReading } from './catalog-session.svelte';

type FeedReport = { readonly kind: 'failed' } | { readonly kind: 'ready'; readonly head: FeedHead };

function readingOf(report: FeedReport): FeedReading {
  return report.kind === 'failed'
    ? { kind: 'failed' }
    : { kind: 'ready', search: report.head.search };
}

export { readingOf };
export type { FeedReport };
