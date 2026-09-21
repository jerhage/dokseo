import { describe, expect, it } from 'vitest';
import { bandsOfInk, inkPerRow, textLineBands } from './text-line-bands';

const LIGHT = 250;

const DARK = 20;

function image(rows: readonly number[], width: number): number[] {
  return rows.flatMap((inked) =>
    Array.from({ length: width }, (_unused, column) => (column < inked ? DARK : LIGHT)),
  );
}

function inverted(pixels: readonly number[]): number[] {
  return pixels.map((value) => (value === DARK ? LIGHT : DARK));
}

function twoLines(): number[] {
  const counts: number[] = [];
  for (let row = 0; row < 40; row += 1) {
    const inked = (row >= 5 && row < 15) || (row >= 25 && row < 35);
    counts.push(inked ? 20 : 0);
  }
  return counts;
}

describe('inkPerRow', () => {
  it('counts the dark pixels of each row over a light ground', () => {
    expect(inkPerRow(image([0, 6, 3], 10), 10, 3)).toEqual([0, 6, 3]);
  });

  it('counts the light pixels of each row over a dark ground, where the ink is light', () => {
    expect(inkPerRow(inverted(image([0, 6, 3], 10)), 10, 3)).toEqual([0, 6, 3]);
  });

  it('counts nothing in an image with too little contrast to threshold', () => {
    expect(
      inkPerRow(
        Array.from({ length: 30 }, () => 128),
        10,
        3,
      ),
    ).toEqual([0, 0, 0]);
  });
});

describe('bandsOfInk', () => {
  it('separates two lines at the gap between them', () => {
    expect(bandsOfInk(twoLines())).toEqual([
      { top: 5, bottom: 15 },
      { top: 25, bottom: 35 },
    ]);
  });

  it('ignores a speckled row carrying far less ink than a line of text', () => {
    const speckled = twoLines().map((count, row) => (row >= 15 && row < 25 ? 1 : count));
    const dense = speckled.map((count) => count * 5);

    expect(bandsOfInk(dense)).toEqual([
      { top: 5, bottom: 15 },
      { top: 25, bottom: 35 },
    ]);
  });

  it('drops a band too short to be a line of text', () => {
    const flecked = twoLines().map((count, row) => (row === 20 ? 20 : count));
    expect(bandsOfInk(flecked)).toHaveLength(2);
  });

  it('closes a band that runs to the bottom edge', () => {
    const counts = Array.from({ length: 20 }, (_unused, row) => (row >= 10 ? 8 : 0));
    expect(bandsOfInk(counts)).toEqual([{ top: 10, bottom: 20 }]);
  });

  it('finds no band in a blank crop', () => {
    expect(bandsOfInk(Array.from({ length: 20 }, () => 0))).toEqual([]);
  });
});

describe('textLineBands', () => {
  it('cuts a two-line crop into one band per line', () => {
    const rows = Array.from({ length: 40 }, (_unused, row) =>
      (row >= 5 && row < 15) || (row >= 25 && row < 35) ? 20 : 0,
    );

    expect(textLineBands(image(rows, 24), 24, 40)).toEqual([
      { top: 5, bottom: 15 },
      { top: 25, bottom: 35 },
    ]);
  });

  it('reads the whole crop when the projection finds no line at all', () => {
    expect(
      textLineBands(
        Array.from({ length: 300 }, () => 128),
        10,
        30,
      ),
    ).toEqual([{ top: 0, bottom: 30 }]);
  });

  it('reads nothing from a crop with no pixels', () => {
    expect(textLineBands([], 0, 0)).toEqual([]);
  });
});
