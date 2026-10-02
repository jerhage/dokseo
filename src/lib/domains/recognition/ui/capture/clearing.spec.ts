import { describe, expect, it } from 'vitest';
import { clearScope, clearWarning } from './clearing';
import type { Counted } from './clearing';

function read(): Counted {
  return { origin: 'recognized' };
}

function wrote(): Counted {
  return { origin: 'written' };
}

function tookFromTheBook(): Counted {
  return { origin: 'lifted' };
}

describe('clearScope', () => {
  it('finds nothing to delete in an empty panel', () => {
    expect(clearScope([])).toEqual({ kind: 'nothing' });
  });

  it('counts readings alone', () => {
    expect(clearScope([read(), read()])).toEqual({ kind: 'readings', readings: 2 });
  });

  it('counts a lifted passage with the readings, because the book still holds it', () => {
    expect(clearScope([read(), tookFromTheBook()])).toEqual({ kind: 'readings', readings: 2 });
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

  it.each([
    [{ kind: 'readings', readings: 1 }, '1 reading?'],
    [{ kind: 'notes', notes: 1 }, '1 note?'],
  ] as const)('says one, not 1 of a plural, for %o', (scope, singular) => {
    expect(clearWarning(scope)).toContain(singular);
  });
});
