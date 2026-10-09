import { describe, expect, it } from 'vitest';
import { PagedAnnouncer } from './paged-announcer';
import { knownTotal, showingText } from './read-paged-state';
import type { MoreState, PagedReadState } from './read-paged-state';

type Missing = { readonly kind: 'offline' };

const OFFLINE: Missing = { kind: 'offline' };

function ready(
  items: readonly string[],
  more: MoreState<Missing>,
  refreshing = false,
): PagedReadState<string, Missing> {
  return { kind: 'ready', items, total: knownTotal(5), refreshing, more };
}

function announcer() {
  const said: string[] = [];
  const subject = new PagedAnnouncer<string, Missing>(
    { showing: showingText, failed: (problem) => `Failed: ${problem.kind}` },
    (text) => said.push(text),
  );
  return { said, subject };
}

describe('PagedAnnouncer', () => {
  it('says each loaded page once', () => {
    const { said, subject } = announcer();

    subject.observe({ kind: 'loading' });
    subject.observe(ready(['a'], { kind: 'more' }));
    subject.observe(ready(['a'], { kind: 'more' }));
    subject.observe(ready(['a'], { kind: 'loading' }));
    subject.observe(ready(['a', 'b'], { kind: 'end' }));

    expect(said).toEqual(['Showing 1 of 5', 'Showing 2 of 5']);
  });

  it('says nothing for a refresh that leaves the count unchanged', () => {
    const { said, subject } = announcer();

    subject.observe(ready(['a'], { kind: 'end' }));
    subject.observe(ready(['a'], { kind: 'end' }, true));
    subject.observe(ready(['a'], { kind: 'end' }));

    expect(said).toEqual(['Showing 1 of 5']);
  });

  it('says the failure text once when the next page fails, and again after a page loads between', () => {
    const { said, subject } = announcer();

    subject.observe(ready(['a'], { kind: 'failed', failure: OFFLINE }));
    subject.observe(ready(['a'], { kind: 'failed', failure: OFFLINE }));
    subject.observe(ready(['a'], { kind: 'loading' }));
    subject.observe(ready(['a'], { kind: 'failed', failure: OFFLINE }));
    subject.observe(ready(['a', 'b'], { kind: 'more' }));
    subject.observe(ready(['a', 'b'], { kind: 'failed', failure: OFFLINE }));

    expect(said).toEqual(['Failed: offline', 'Showing 2 of 5', 'Failed: offline']);
  });
});
