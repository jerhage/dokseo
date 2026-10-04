import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import { pageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import { LOADING, readFailed as stateFailed, readReady } from '$lib/shared/read-state';
import type { Capture } from '../../domain/capture/capture';
import { namedTag } from '../../domain/tag/tag';
import { READ, READING, captureListBody, captureReadOf, readFailed } from './capture-read';

const ROW: Capture = {
  id: captureId('a'),
  bookId: bookId('one'),
  anchor: regionAnchor([{ index: imageIndex(1), rect: pageRect(0, 0, 0.01, 0.01) }]),
  text: '海',
  origin: 'written',
  createdAt: 1,
  editedAt: null,
  tagIds: [],
};

const TAG = namedTag(tagId('sfx'), 'sfx', 'slate', 1);

describe('captureListBody', () => {
  it('shows the cards whenever there are any, even beside a failed read', () => {
    expect(captureListBody(READING, 2)).toBe('cards');
    expect(captureListBody(READ, 1)).toBe('cards');
    expect(captureListBody(readFailed('broke'), 1)).toBe('cards');
  });

  it('says the captures are being read while the list is read and no card is held', () => {
    expect(captureListBody(READING, 0)).toBe('reading');
  });

  it('invites a first capture once the list is read and empty', () => {
    expect(captureListBody(READ, 0)).toBe('invitation');
  });

  it('shows nothing under the failure when the read failed and no card is held', () => {
    expect(captureListBody(readFailed('broke'), 0)).toBe('nothing');
  });
});

describe('captureReadOf', () => {
  it('reports the list read once both the captures and the tags are read', () => {
    expect(captureReadOf(readReady([ROW]), readReady([TAG]))).toEqual(READ);
  });

  it('reports the list as being read while either read is still out', () => {
    expect(captureReadOf(LOADING, readReady([TAG]))).toEqual(READING);
    expect(captureReadOf(readReady([ROW]), LOADING)).toEqual(READING);
  });

  it('fails with the captures read before the tags read', () => {
    expect(captureReadOf(stateFailed('no captures'), stateFailed('no tags'))).toEqual(
      readFailed('no captures'),
    );
  });

  it('fails a list whose tags could not be read, though its captures were', () => {
    expect(captureReadOf(readReady([ROW]), stateFailed('no tags'))).toEqual(readFailed('no tags'));
  });
});
