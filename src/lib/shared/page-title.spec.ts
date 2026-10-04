import { describe, expect, it } from 'vitest';
import { pageTitle } from './page-title';

describe('pageTitle', () => {
  it('names the screen first and the app last', () => {
    expect(pageTitle('Library')).toBe('Library · Dokseo');
  });

  it('puts a section after its screen, behind a colon', () => {
    expect(pageTitle('Settings', 'Your data')).toBe('Settings: Your data · Dokseo');
  });

  it('names the screen alone when no section is shown', () => {
    expect(pageTitle('Settings', null)).toBe('Settings · Dokseo');
  });

  it('keeps a book title exactly as written', () => {
    expect(pageTitle('こころ: 上')).toBe('こころ: 上 · Dokseo');
  });
});
