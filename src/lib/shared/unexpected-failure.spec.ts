import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { createToaster } from '$lib/components/toaster.svelte';
import {
  UNEXPECTED_FAILURE_TITLE,
  UnexpectedFailures,
  logUnexpected,
  unexpectedMessage,
  windowErrorCause,
} from './unexpected-failure';

let logged: MockInstance<typeof console.error>;

beforeEach(() => {
  logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  logged.mockRestore();
});

describe('logUnexpected', () => {
  it('logs the error itself, so the console keeps its stack', () => {
    const error = new Error('broken');

    logUnexpected('render', error);

    expect(logged).toHaveBeenCalledWith('Unexpected failure (render)', error);
  });
});

describe('unexpectedMessage', () => {
  it('prefixes the cause with the generic sentence', () => {
    expect(unexpectedMessage(new TypeError('x is undefined'))).toBe(
      'Something went wrong: x is undefined',
    );
    expect(unexpectedMessage('plain')).toBe('Something went wrong: plain');
  });
});

describe('windowErrorCause', () => {
  it('reads the thrown value of an error event', () => {
    const thrown = new Error('boom');
    const event = Object.assign(new Event('error'), { error: thrown });

    expect(windowErrorCause(event)).toBe(thrown);
  });

  it('falls back to the event when it carries no error', () => {
    const event = new Event('error');

    expect(windowErrorCause(event)).toBe(event);
  });
});

describe('UnexpectedFailures', () => {
  it('logs the failure and raises a danger toast with its message', () => {
    const toaster = createToaster();
    const error = new Error('rejected');

    new UnexpectedFailures(toaster).raise('promise', error);

    expect(logged).toHaveBeenCalledWith('Unexpected failure (promise)', error);
    expect(toaster.toasts).toHaveLength(1);
    expect(toaster.toasts[0]).toMatchObject({
      variant: 'danger',
      title: UNEXPECTED_FAILURE_TITLE,
      message: 'rejected',
    });
  });

  it('raises one toast while it is shown, and logs every failure', () => {
    const toaster = createToaster();
    const failures = new UnexpectedFailures(toaster);

    failures.raise('window', new Error('first'));
    failures.raise('promise', new Error('second'));

    expect(toaster.toasts).toHaveLength(1);
    expect(logged).toHaveBeenCalledTimes(2);
  });

  it('raises a new toast once the last one is dismissed', () => {
    const toaster = createToaster();
    const failures = new UnexpectedFailures(toaster);
    failures.raise('window', new Error('first'));
    const first = toaster.toasts[0];
    if (first === undefined) throw new Error('no toast');

    toaster.dismiss(first.id);
    failures.raise('window', new Error('second'));

    expect(toaster.toasts.filter((toast) => toast.phase === 'shown')).toMatchObject([
      { message: 'second' },
    ]);
  });
});
