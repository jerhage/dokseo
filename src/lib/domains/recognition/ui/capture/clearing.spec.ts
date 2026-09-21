import { describe, expect, it } from 'vitest';
import { clearScope, clearWarning } from './clearing';
import type { Counted } from './clearing';

function read(): Counted {
  return { origin: 'recognized' };
}

function wrote(): Counted {
  return { origin: 'written' };
}

describe('clearScope', () => {
  it('finds nothing to delete in an empty panel', () => {
    expect(clearScope([])).toEqual({ kind: 'nothing' });
  });

  it('counts readings alone', () => {
    expect(clearScope([read(), read()])).toEqual({ kind: 'readings', readings: 2 });
  });

  it('counts notes alone', () => {
    expect(clearScope([wrote()])).toEqual({ kind: 'notes', notes: 1 });
  });

  it('counts both apart, because they are not equally replaceable', () => {
    expect(clearScope([read(), wrote(), read()])).toEqual({
      kind: 'both',
      readings: 2,
      notes: 1,
    });
  });
});

describe('clearWarning', () => {
  it('warns about nothing when there is nothing to delete', () => {
    expect(clearWarning({ kind: 'nothing' })).toBeNull();
  });

  it('says a reading can be read again', () => {
    const warning = clearWarning({ kind: 'readings', readings: 4 });

    expect(warning).toContain('4 readings');
    expect(warning).toContain('read them again');
  });

  it('says writing cannot be recovered, which is the point of asking', () => {
    const warning = clearWarning({ kind: 'notes', notes: 3 });

    expect(warning).toContain('3 notes');
    expect(warning).toContain('Nothing you wrote can be recovered');
  });

  it('names both counts and tells them apart', () => {
    const warning = clearWarning({ kind: 'both', readings: 7, notes: 2 });

    expect(warning).toContain('7 readings');
    expect(warning).toContain('2 notes');
    expect(warning).toContain('The notes cannot');
  });

  it('says one reading, not 1 readings', () => {
    expect(clearWarning({ kind: 'readings', readings: 1 })).toContain('1 reading?');
  });

  it('says one note, not 1 notes', () => {
    expect(clearWarning({ kind: 'notes', notes: 1 })).toContain('1 note?');
  });
});
