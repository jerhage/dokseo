import { describe, expect, it } from 'vitest';
import {
  arrivingAt,
  landedAt,
  NOT_STANDING,
  standingAfterMove,
  standingHolds,
} from './flow-arrival';
import { REFLOWED, TRAVELLED } from './flow-move';

const PASSAGE = 'epubcfi(/6/14!/4/2/14,/1:0,/1:4)';

const LANDED_PAGE = 'epubcfi(/6/14!/4/2/10,/1:0,/1:14)';

const SETTLED_PAGE = 'epubcfi(/6/14!/4/2/12,/1:0,/1:9)';

const ANOTHER_PAGE = 'epubcfi(/6/16!/4/2/2,/1:0,/1:9)';

describe('standingHolds', () => {
  it('holds while the reader is being taken to the passage and once they are there', () => {
    expect(standingHolds(arrivingAt(PASSAGE))).toBe(true);
    expect(standingHolds(landedAt(PASSAGE, LANDED_PAGE))).toBe(true);
  });

  it('holds nothing when no arrival was made', () => {
    expect(standingHolds(NOT_STANDING)).toBe(false);
  });

  it('holds nothing for an arrival at an empty cfi', () => {
    expect(standingHolds(landedAt('', LANDED_PAGE))).toBe(false);
  });
});

describe('standingAfterMove', () => {
  it('ends the arrival when the reader travels to another page', () => {
    const moved = standingAfterMove(landedAt(PASSAGE, LANDED_PAGE), ANOTHER_PAGE, TRAVELLED);

    expect(moved).toEqual(NOT_STANDING);
  });

  it('keeps the arrival when foliate re-lays the page, and follows it to where it settled', () => {
    const moved = standingAfterMove(landedAt(PASSAGE, LANDED_PAGE), SETTLED_PAGE, REFLOWED);

    expect(moved).toEqual(landedAt(PASSAGE, SETTLED_PAGE));
  });

  it('ends the arrival on travel after a re-layout moved it', () => {
    const settled = standingAfterMove(landedAt(PASSAGE, LANDED_PAGE), SETTLED_PAGE, REFLOWED);

    expect(standingAfterMove(settled, ANOTHER_PAGE, TRAVELLED)).toEqual(NOT_STANDING);
  });

  it('returns the same arrival for a move that stays on the page it landed on', () => {
    const landed = landedAt(PASSAGE, LANDED_PAGE);

    expect(standingAfterMove(landed, LANDED_PAGE, TRAVELLED)).toBe(landed);
  });

  it('keeps an arrival still on its way through the travel its own jump causes', () => {
    const arriving = arrivingAt(PASSAGE);

    expect(standingAfterMove(arriving, ANOTHER_PAGE, TRAVELLED)).toBe(arriving);
  });

  it('starts nothing from a move when no arrival was made', () => {
    expect(standingAfterMove(NOT_STANDING, ANOTHER_PAGE, REFLOWED)).toBe(NOT_STANDING);
  });
});
