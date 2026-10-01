import { describe, expect, it } from 'vitest';
import { QueryFailure, failureMessage, unwrap } from './query-failure';
import { err, ok } from './result';
import { createTestQueryClient } from './testing/query-client';

const describeDenied = (reason: string) => `The shelf could not be read: ${reason}`;

describe('unwrap', () => {
  it('returns the value of an ok result', () => {
    expect(unwrap(ok(3), describeDenied)).toBe(3);
  });

  it('throws a QueryFailure carrying the described error', () => {
    expect(() => unwrap(err('locked'), describeDenied)).toThrow(
      new QueryFailure('The shelf could not be read: locked'),
    );
  });

  it('keeps the error value as the failure cause', () => {
    expect(() => unwrap(err('locked'), describeDenied)).toThrow(
      expect.objectContaining({ cause: 'locked' }),
    );
  });

  it('rejects a fetched query with the described message', async () => {
    const client = createTestQueryClient();

    const fetched = client.fetchQuery({
      queryKey: ['shelf'],
      queryFn: async () => unwrap(err('locked'), describeDenied),
    });

    await expect(fetched).rejects.toBeInstanceOf(QueryFailure);
    await expect(fetched).rejects.toThrow('The shelf could not be read: locked');
  });
});

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
