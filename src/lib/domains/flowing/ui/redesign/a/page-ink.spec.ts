import { describe, expect, it } from 'vitest';
import { pageInk, pageScheme } from './page-ink';

describe('pageScheme', () => {
  it('follows the pinned scheme whatever the system prefers', () => {
    expect(pageScheme('light', true)).toBe('light');
    expect(pageScheme('dark', false)).toBe('dark');
    expect(pageScheme('only dark', false)).toBe('dark');
  });

  it('follows the system preference when the page offers both schemes', () => {
    expect(pageScheme('light dark', true)).toBe('dark');
    expect(pageScheme('light dark', false)).toBe('light');
    expect(pageScheme('dark light', false)).toBe('light');
  });

  it('answers light for a page that declares no scheme', () => {
    expect(pageScheme('normal', true)).toBe('light');
    expect(pageScheme('', true)).toBe('light');
  });
});

describe('pageInk', () => {
  it('carries the read colours and inks a selection in the text colour', () => {
    expect(
      pageInk({
        declaredScheme: 'dark',
        prefersDark: false,
        text: 'rgb(1, 2, 3)',
        link: 'rgb(4, 5, 6)',
        selection: 'rgb(7, 8, 9)',
      }),
    ).toEqual({
      scheme: 'dark',
      text: 'rgb(1, 2, 3)',
      link: 'rgb(4, 5, 6)',
      selection: 'rgb(7, 8, 9)',
      selectionText: 'rgb(1, 2, 3)',
    });
  });
});
