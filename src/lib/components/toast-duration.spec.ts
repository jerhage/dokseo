import { describe, expect, it } from 'vitest';
import { parseDuration, toastDuration, toastTimeout } from './toast-duration';

describe('parseDuration', () => {
  it('reads seconds as milliseconds', () => {
    expect(parseDuration('5s')).toBe(5000);
  });

  it('reads milliseconds as they are', () => {
    expect(parseDuration('4500ms')).toBe(4500);
  });

  it('reads a fraction of a second', () => {
    expect([parseDuration('0.25s'), parseDuration('.5s')]).toEqual([250, 500]);
  });

  it('reads through the whitespace a computed custom property keeps', () => {
    expect(parseDuration(' 6s ')).toBe(6000);
  });

  it('rejects an empty value, as an unloaded stylesheet gives', () => {
    expect(parseDuration('')).toBeUndefined();
  });

  it('rejects a number with no unit', () => {
    expect(parseDuration('5000')).toBeUndefined();
  });

  it('rejects a negative time and a value that is no time at all', () => {
    expect([parseDuration('-2s'), parseDuration('var(--x)')]).toEqual([undefined, undefined]);
  });
});

describe('toastDuration', () => {
  it('leaves an unrequested duration to the stylesheet', () => {
    expect(toastDuration(undefined)).toEqual({ kind: 'default' });
  });

  it('times a toast for the milliseconds requested', () => {
    expect(toastDuration(2500)).toEqual({ kind: 'timed', ms: 2500 });
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

  it('never times a persistent toast', () => {
    expect(toastTimeout({ kind: 'persistent' }, '5s')).toBeUndefined();
  });
});
