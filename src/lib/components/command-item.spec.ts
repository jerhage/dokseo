import { describe, expect, it } from 'vitest';
import { commandItemElement } from './command-item';

describe('commandItemElement', () => {
  it('renders a button without a link, a link with one, and a static row as its own element', () => {
    expect([
      commandItemElement(undefined, undefined),
      commandItemElement('/somewhere', undefined),
      commandItemElement(undefined, 'div'),
      commandItemElement('/somewhere', 'div'),
    ]).toEqual(['button', 'a', 'div', 'div']);
  });
});
