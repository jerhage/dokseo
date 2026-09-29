import { describe, expect, it } from 'vitest';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import type { ArrivalCapture } from '../../domain/capture/capture-arrival';
import { arrivalSteps } from './arrival-steps';

const BOOK = bookId('book-1');

function onImage(id: string, index: number, x: number): ArrivalCapture {
  return {
    id: captureId(id),
    origin: 'recognized',
    text: 'ねこ',
    note: null,
    anchor: regionAnchor([{ index: imageIndex(index), rect: imageRect(x, 20.5, 10, 30.125) }]),
  };
}

const IN_TEXT: ArrivalCapture = {
  id: captureId('t1'),
  origin: 'lifted',
  text: 'ねこ',
  note: null,
  anchor: textAnchor(
    'epubcfi(/6/4!/4/2,/1:0,/1:2)',
    {
      exact: 'ねこ',
      prefix: '',
      suffix: '',
    },
    null,
  ),
};

describe('arrivalSteps', () => {
  it('names the match counted from one out of the total', () => {
    const stepping = {
      ordinal: 2,
      total: 5,
      previous: onImage('a', 1, 0),
      next: onImage('b', 7, 0),
    };

    expect(arrivalSteps(BOOK, 'ねこ', stepping).count).toBe('match 2 of 5');
  });

  it('links each neighbour to its image and region with the query carried and no capture id', () => {
    const stepping = {
      ordinal: 2,
      total: 5,
      previous: onImage('a', 1, 4),
      next: onImage('b', 1, 60),
    };
    const steps = arrivalSteps(BOOK, 'ねこ', stepping);

    expect(steps.previous).toBe(
      '/read/book-1?image=1&region=4,20.5,10,30.13&find=%E3%81%AD%E3%81%93',
    );
    expect(steps.next).toBe('/read/book-1?image=1&region=60,20.5,10,30.13&find=%E3%81%AD%E3%81%93');
  });

  it('links a neighbour anchored in text to its passage with the query carried and no capture id', () => {
    const stepping = { ordinal: 1, total: 2, previous: IN_TEXT, next: IN_TEXT };
    const steps = arrivalSteps(BOOK, 'ねこ', stepping);

    expect(steps.previous).toBe(
      '/read/book-1?cfi=epubcfi(%2F6%2F4!%2F4%2F2%2C%2F1%3A0%2C%2F1%3A2)&find=%E3%81%AD%E3%81%93',
    );
    expect(steps.next).toBe(steps.previous);
  });

  it('gives no link to a neighbour that names no place', () => {
    const nowhere: ArrivalCapture = { ...onImage('n', 0, 0), anchor: regionAnchor([]) };
    const unplaced: ArrivalCapture = {
      ...IN_TEXT,
      anchor: textAnchor('', { exact: 'ねこ', prefix: '', suffix: '' }, null),
    };
    const stepping = { ordinal: 1, total: 3, previous: nowhere, next: unplaced };
    const steps = arrivalSteps(BOOK, 'ねこ', stepping);

    expect([steps.previous, steps.next]).toEqual([null, null]);
  });
});
