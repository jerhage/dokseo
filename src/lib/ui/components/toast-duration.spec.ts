import { describe, expect, it } from 'vitest';
import { parseDuration, toastDuration, toastTimeout } from './toast-duration';

describe('parseDuration', () => {
  it.each([
    ['seconds as milliseconds', '5s', 5000],
    ['milliseconds as they are', '4500ms', 4500],
    ['a fraction of a second', '0.25s', 250],
    ['a fraction of a second with no leading zero', '.5s', 500],
    ['through the whitespace a computed custom property keeps', ' 6s ', 6000],
  ])('reads %s', (_case, value, ms) => {
    expect(parseDuration(value)).toBe(ms);
  });

  it.each([
    ['an empty value, as an unloaded stylesheet gives', ''],
    ['a number with no unit', '5000'],
    ['a negative time', '-2s'],
    ['a value that is no time at all', 'var(--x)'],
  ])('rejects %s', (_case, value) => {
    expect(parseDuration(value)).toBeUndefined();
  });
});

describe('toastDuration', () => {
  it('leaves an unrequested duration to the stylesheet', () => {
    expect(toastDuration(undefined)).toEqual({ kind: 'default' });
  });

  it.each([
    ['without an action', 2500, false],
    ['with an action', 9000, true],
  ])('times a toast %s for the milliseconds requested', (_case, ms, offersAction) => {
    expect(toastDuration(ms, offersAction)).toEqual({ kind: 'timed', ms });
  });

  it('keeps an unrequested toast with an action up until dismissed', () => {
    expect(toastDuration(undefined, true)).toEqual({ kind: 'persistent' });
  });

  it('keeps a toast up when asked to persist', () => {
    expect(toastDuration('persistent')).toEqual({ kind: 'persistent' });
  });

  it('keeps a toast up for a duration of zero or less', () => {
    expect([toastDuration(0), toastDuration(-1)]).toEqual([
      { kind: 'persistent' },
      { kind: 'persistent' },
    ]);
  });
});

describe('toastTimeout', () => {
  it('times a default toast by the stylesheet', () => {
    expect(toastTimeout({ kind: 'default' }, '5s')).toBe(5000);
  });

  it('keeps a default toast up when the stylesheet gives no usable time', () => {
    expect([
      toastTimeout({ kind: 'default' }, ''),
      toastTimeout({ kind: 'default' }, '0s'),
    ]).toEqual([undefined, undefined]);
  });

  it('times a timed toast by its own duration, whatever the stylesheet says', () => {
    expect(toastTimeout({ kind: 'timed', ms: 1200 }, '5s')).toBe(1200);
  });

  it('times no persistent toast', () => {
    expect(toastTimeout({ kind: 'persistent' }, '5s')).toBeUndefined();
  });
});
