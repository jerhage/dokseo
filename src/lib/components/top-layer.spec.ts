import { describe, expect, it } from 'vitest';
import { entersTopLayer } from './top-layer';

const region = new EventTarget();
const menu = new EventTarget();

describe('entersTopLayer', () => {
  it('reports another element that opens', () => {
    expect(entersTopLayer({ target: menu, newState: 'open' }, region)).toBe(true);
  });

  it('ignores another element that closes', () => {
    expect(entersTopLayer({ target: menu, newState: 'closed' }, region)).toBe(false);
  });

  it('ignores the region opening itself', () => {
    expect(entersTopLayer({ target: region, newState: 'open' }, region)).toBe(false);
  });

  it('ignores an event that carries no toggle state', () => {
    expect(entersTopLayer({ target: menu }, region)).toBe(false);
  });
});
