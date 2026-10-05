import { describe, expect, it } from 'vitest';
import { entersTopLayer } from './top-layer';

const region = new EventTarget();
const menu = new EventTarget();

describe('entersTopLayer', () => {
  it('reports another element that opens', () => {
    expect(entersTopLayer({ target: menu, newState: 'open' }, region)).toBe(true);
  });

  it.each([
    ['another element that closes', { target: menu, newState: 'closed' }],
    ['the region opening itself', { target: region, newState: 'open' }],
    ['an event that carries no toggle state', { target: menu }],
  ])('ignores %s', (_case, event) => {
    expect(entersTopLayer(event, region)).toBe(false);
  });
});
