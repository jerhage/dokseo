import { describe, expect, it } from 'vitest';
import {
  isFraction,
  isFractionOrNull,
  isNumber,
  isNumberOrNull,
  isWholeNumber,
} from './corrupt-row';

const NOT_FINITE = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];

describe('isNumber', () => {
  it.each([0, -3.5, 1758240000000])('passes the finite number %s', (value) => {
    expect(isNumber(value)).toBe(true);
  });

  it.each([...NOT_FINITE, '1', null, undefined])('rejects %s', (value) => {
    expect(isNumber(value)).toBe(false);
  });
});

describe('isNumberOrNull', () => {
  it.each([null, 0, 2.5])('passes %s', (value) => {
    expect(isNumberOrNull(value)).toBe(true);
  });

  it.each([...NOT_FINITE, undefined, '2'])('rejects %s', (value) => {
    expect(isNumberOrNull(value)).toBe(false);
  });
});

describe('isWholeNumber', () => {
  it.each([0, 1, 182, Number.MAX_SAFE_INTEGER])('passes %s', (value) => {
    expect(isWholeNumber(value)).toBe(true);
  });

  it.each([-1, 1.5, -0.5, Number.MAX_SAFE_INTEGER + 1, ...NOT_FINITE, '3', null])(
    'rejects %s',
    (value) => {
      expect(isWholeNumber(value)).toBe(false);
    },
  );
});

describe('isFraction', () => {
  it.each([0, 0.35, 1])('passes %s', (value) => {
    expect(isFraction(value)).toBe(true);
  });

  it.each([-0.1, 1.01, 7, ...NOT_FINITE, null, '0.5'])('rejects %s', (value) => {
    expect(isFraction(value)).toBe(false);
  });
});

describe('isFractionOrNull', () => {
  it.each([null, 0, 1])('passes %s', (value) => {
    expect(isFractionOrNull(value)).toBe(true);
  });

  it.each([undefined, 1.5, Number.NaN])('rejects %s', (value) => {
    expect(isFractionOrNull(value)).toBe(false);
  });
});
