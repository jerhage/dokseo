import { describe, expect, it } from 'vitest';
import { commandItemElement } from './command-item';

describe('commandItemElement', () => {
  it('renders a button when there is no link', () => {
    expect(commandItemElement(undefined, undefined)).toBe('button');
  });

  it('renders a link when there is an href', () => {
    expect(commandItemElement('/somewhere', undefined)).toBe('a');
  });

  it('renders a plain element for a static row, with or without an href', () => {
    expect(commandItemElement(undefined, 'div')).toBe('div');
    expect(commandItemElement('/somewhere', 'div')).toBe('div');
  });
});
