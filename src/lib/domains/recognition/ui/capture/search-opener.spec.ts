import { describe, expect, it } from 'vitest';
import { openerOf } from './search-opener';

describe('openerOf', () => {
  it('returns the focused control when the search opens from the keyboard', () => {
    expect(openerOf('field', 'icon', 'body')).toBe('field');
  });

  it('returns the pressed control when a tap left the focus on the page', () => {
    expect(openerOf('body', 'icon', 'body')).toBe('icon');
    expect(openerOf(null, 'icon', 'body')).toBe('icon');
  });

  it('returns nothing when no control was focused or pressed', () => {
    expect(openerOf('body', null, 'body')).toBeNull();
  });
});
