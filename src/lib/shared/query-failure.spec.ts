import { describe, expect, it } from 'vitest';
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
});
