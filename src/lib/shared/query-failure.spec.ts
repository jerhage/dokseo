import { describe, expect, it, vi } from 'vitest';
import { QueryFailure, failureMessage } from './query-failure';

describe('failureMessage', () => {
  it('reads the message of a QueryFailure as written', () => {
    expect(failureMessage(new QueryFailure('denied'))).toBe('denied');
  });

  it('prefixes any other thrown value with a generic sentence', () => {
    expect(failureMessage(new RangeError('out of range'))).toBe(
      'Something went wrong: out of range',
    );
    expect(failureMessage(42)).toBe('Something went wrong: 42');
  });

  it('logs a thrown value that is not a QueryFailure, and only that', () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const thrown = new RangeError('out of range');

    failureMessage(new QueryFailure('denied'));
    failureMessage(thrown);

    expect(logged).toHaveBeenCalledTimes(1);
    expect(logged).toHaveBeenCalledWith('Unexpected failure (query)', thrown);
    logged.mockRestore();
  });
});
