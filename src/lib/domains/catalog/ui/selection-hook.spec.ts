import { describe, expect, it } from 'vitest';
import { createSelection } from './selection.svelte';

describe('createSelection', () => {
  it('toggles an entry on and off', () => {
    const selection = createSelection();

    selection.toggle('a');
    expect([...selection.chosen]).toEqual(['a']);
    selection.toggle('a');

    expect([...selection.chosen]).toEqual([]);
  });

  it('selects the entries it is given at once', () => {
    const selection = createSelection();

    selection.selectAll(['a', 'c']);

    expect([...selection.chosen]).toEqual(['a', 'c']);
  });

  it('clears the selection', () => {
    const selection = createSelection();
    selection.selectAll(['a', 'b']);

    selection.clear();

    expect(selection.chosen.size).toBe(0);
  });

  it('drops one entry and keeps the rest', () => {
    const selection = createSelection();
    selection.selectAll(['a', 'b']);

    selection.drop('a');

    expect([...selection.chosen]).toEqual(['b']);
  });

  it('drops nothing, and reports nothing, for an entry that is not chosen', () => {
    const kept: ReadonlySet<string>[] = [];
    const selection = createSelection(new Set(['a']), (ids) => kept.push(ids));

    selection.drop('z');

    expect(kept).toEqual([]);
  });

  it('starts from a saved selection', () => {
    const selection = createSelection(new Set(['a', 'b']));

    expect([...selection.chosen]).toEqual(['a', 'b']);
  });

  it('hands every change to the one that keeps it', () => {
    const kept: string[][] = [];
    const selection = createSelection(new Set(), (ids) => kept.push([...ids]));

    selection.toggle('a');
    selection.selectAll(['a', 'b']);
    selection.drop('a');
    selection.clear();

    expect(kept).toEqual([['a'], ['a', 'b'], ['b'], []]);
  });
});
