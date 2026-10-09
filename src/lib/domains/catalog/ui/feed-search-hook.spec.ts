import { describe, expect, it } from 'vitest';
import { catalogId } from '$lib/shared/ids';
import { SEARCH_DEBOUNCE_MS, createFeedSearch } from './feed-search.svelte';
import type { SearchClock } from './feed-search.svelte';

class ManualClock implements SearchClock {
  now = 0;
  #timers = new Map<number, { at: number; run: () => void }>();
  #next = 0;

  after = (ms: number, run: () => void): (() => void) => {
    const id = this.#next++;
    this.#timers.set(id, { at: this.now + ms, run });
    return () => void this.#timers.delete(id);
  };

  advance(ms: number): void {
    this.now += ms;
    for (const [id, timer] of this.#timers) {
      if (timer.at > this.now) continue;
      this.#timers.delete(id);
      timer.run();
    }
  }
}

const HOME = catalogId('home');
const ARCHIVE = catalogId('archive');

function setup() {
  const clock = new ManualClock();
  const searched: string[] = [];
  const run = (text: string): string => {
    searched.push(text);
    return `after-${text}`;
  };
  return { clock, search: createFeedSearch(clock), searched, run };
}

describe('createFeedSearch', () => {
  it('sends one search after rapid typing pauses', () => {
    const { clock, search, searched, run } = setup();

    for (const typed of ['m', 'mo', 'moo', 'moon']) {
      search.type(HOME, typed, 'e1', run);
      clock.advance(SEARCH_DEBOUNCE_MS - 100);
    }
    expect(searched).toEqual([]);
    clock.advance(100);

    expect(searched).toEqual(['moon']);
  });

  it('keeps what was typed as a draft tagged with the entry it was typed on', () => {
    const { search, run } = setup();

    search.type(HOME, 'mo', 'e1', run);

    expect(search.draftOf(HOME)).toEqual({ text: 'mo', entry: 'e1' });
  });

  it('retags the draft with the entry the search produced', () => {
    const { clock, search, run } = setup();
    search.type(HOME, 'moon', 'e1', run);

    clock.advance(SEARCH_DEBOUNCE_MS);

    expect(search.draftOf(HOME)).toEqual({ text: 'moon', entry: 'after-moon' });
  });

  it('searches at once on submit and drops the pending timer', () => {
    const { clock, search, searched, run } = setup();
    search.type(HOME, 'moon', 'e1', run);

    search.submit(HOME, 'moon', run);
    clock.advance(SEARCH_DEBOUNCE_MS);

    expect(searched).toEqual(['moon']);
  });

  it('keeps each catalog its own draft and its own timer', () => {
    const { clock, search, searched, run } = setup();
    search.type(HOME, 'moon', 'e1', run);
    search.type(ARCHIVE, 'star', 'e2', run);

    clock.advance(SEARCH_DEBOUNCE_MS);

    expect(searched.toSorted()).toEqual(['moon', 'star']);
    expect(search.draftOf(HOME)?.text).toBe('moon');
    expect(search.draftOf(ARCHIVE)?.text).toBe('star');
  });

  it('sends no search once disposed', () => {
    const { clock, search, searched, run } = setup();
    search.type(HOME, 'moon', 'e1', run);

    search.dispose();
    clock.advance(SEARCH_DEBOUNCE_MS);

    expect(searched).toEqual([]);
  });
});
