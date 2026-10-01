import { describe, expect, it } from 'vitest';
import { READ, READING, captureListBody, readFailed } from './capture-read';

describe('captureListBody', () => {
  it('shows the cards whenever there are any, even beside a failed read', () => {
    expect(captureListBody(READING, 2)).toBe('cards');
    expect(captureListBody(READ, 1)).toBe('cards');
    expect(captureListBody(readFailed('broke'), 1)).toBe('cards');
  });

  it('invites a first capture while the list is still read, as it does once the list is read', () => {
    expect(captureListBody(READING, 0)).toBe('invitation');
    expect(captureListBody(READ, 0)).toBe('invitation');
  });

  it('shows nothing under the failure when the read failed and no card is held', () => {
    expect(captureListBody(readFailed('broke'), 0)).toBe('nothing');
  });
});
