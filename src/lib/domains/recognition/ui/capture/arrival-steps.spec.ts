import { describe, expect, it } from 'vitest';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import type { ArrivalCapture } from '../../domain/capture/capture-arrival';
import { arrivalSteps } from './arrival-steps';

const BOOK = bookId('book-1');

function onImage(id: string, index: number): ArrivalCapture {
  return {
    id: captureId(id),
    origin: 'recognized',
    text: 'ねこ',
    note: null,
    anchor: regionAnchor([{ index: imageIndex(index), rect: imageRect(0, 0, 10, 10) }]),
  };
}

const IN_TEXT: ArrivalCapture = {
  id: captureId('t1'),
  origin: 'lifted',
  text: 'ねこ',
  note: null,
  anchor: textAnchor('epubcfi(/6/4!/4/2,/1:0,/1:2)', {
    exact: 'ねこ',
    prefix: '',
    suffix: '',
  }),
};

describe('arrivalSteps', () => {
  it('names the match counted from one out of the total', () => {
    const stepping = {
      ordinal: 2,
      total: 5,
      previous: onImage('a', 1),
      next: onImage('b', 7),
    };

    expect(arrivalSteps(BOOK, 'ねこ', stepping).count).toBe('match 2 of 5');
  });

  it('links each neighbour to its page with the query and the capture carried', () => {
    const stepping = {
      ordinal: 2,
      total: 5,
      previous: onImage('a', 1),
      next: onImage('b', 7),
    };
    const steps = arrivalSteps(BOOK, 'ねこ', stepping);

    expect(steps.previous).toBe('/read/book-1?image=1&find=%E3%81%AD%E3%81%93&capture=a');
    expect(steps.next).toBe('/read/book-1?image=7&find=%E3%81%AD%E3%81%93&capture=b');
  });

  it('gives no link to a neighbour that sits on no page', () => {
    const stepping = {
      ordinal: 1,
      total: 2,
      previous: IN_TEXT,
      next: onImage('b', 3),
    };
    const steps = arrivalSteps(BOOK, 'ねこ', stepping);

    expect([steps.previous === null, steps.next === null]).toEqual([true, false]);
  });
});
