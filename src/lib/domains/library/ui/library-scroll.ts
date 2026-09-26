import { match } from 'ts-pattern';
import type { LibraryBody } from './library-overview';

type ScrollStep =
  | { readonly kind: 'wait' }
  | { readonly kind: 'scroll'; readonly top: number }
  | { readonly kind: 'none' };

const READER_ROUTE = '/read/[fileId]';

const LINK_NAVIGATION = 'link';

function scrollTopFrom(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return value;
}

function returnsFromReader(navigation: string, from: string | null): boolean {
  return navigation === LINK_NAVIGATION && from === READER_ROUTE;
}

function scrollStep(pending: number | null, body: LibraryBody): ScrollStep {
  if (pending === null) return { kind: 'none' };
  return match(body)
    .returnType<ScrollStep>()
    .with('reading', () => ({ kind: 'wait' }))
    .with('listed', () => ({ kind: 'scroll', top: pending }))
    .with('empty', 'failed', () => ({ kind: 'none' }))
    .exhaustive();
}

export { READER_ROUTE, returnsFromReader, scrollStep, scrollTopFrom };
export type { ScrollStep };
