import { describe, expect, it } from 'vitest';
import { IDLE_DRAG, carriesFiles, dropped, entered, left } from './window-drag';
import type { WindowDrag } from './window-drag';

function enteredTimes(times: number): WindowDrag {
  let drag = IDLE_DRAG;
  for (let step = 0; step < times; step++) drag = entered(drag);
  return drag;
}

describe('carriesFiles', () => {
  it.each([
    ['a drag of files from the desktop', ['Files']],
    ['files that arrive alongside other types', ['text/uri-list', 'Files', 'text/plain']],
  ])('reports %s', (_case, types) => {
    expect(carriesFiles(types)).toBe(true);
  });

  it.each([
    ['a dragged link', ['text/uri-list', 'text/plain']],
    ['dragged text and a dragged image from the page', ['text/plain', 'text/html']],
    ['a type that only resembles the files type', ['files', 'application/x-moz-file']],
    ['a drag that carries nothing', []],
  ])('ignores %s', (_case, types) => {
    expect(carriesFiles(types)).toBe(false);
  });
});

describe('window drag', () => {
  it('starts idle', () => {
    expect(IDLE_DRAG).toEqual({ kind: 'idle' });
  });

  it('counts each element the drag enters on its way in', () => {
    expect(enteredTimes(3)).toEqual({ kind: 'carrying', depth: 3 });
  });

  it('keeps carrying when the drag leaves a child for its parent', () => {
    expect(left(enteredTimes(2))).toEqual({ kind: 'carrying', depth: 1 });
  });

  it('keeps carrying across a move between two children, where the enter fires before the leave', () => {
    const overChild = enteredTimes(2);

    expect(left(entered(overChild))).toEqual({ kind: 'carrying', depth: 2 });
  });

  it('returns to idle when the last element is left', () => {
    expect(left(enteredTimes(1))).toEqual({ kind: 'idle' });
  });

  it('stays idle on a leave it never saw enter', () => {
    expect(left(IDLE_DRAG)).toEqual({ kind: 'idle' });
  });

  it('returns to idle on a drop', () => {
    expect(dropped()).toEqual({ kind: 'idle' });
  });

  it.each([
    ['once a drag enters the window', IDLE_DRAG],
    ['afresh after a drop, without the depth of the earlier drag', dropped()],
  ])('carries at depth one %s', (_case, start) => {
    expect(entered(start)).toEqual({ kind: 'carrying', depth: 1 });
  });
});
