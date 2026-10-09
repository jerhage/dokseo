import { describe, expect, it } from 'vitest';
import { headerFieldKey, pressHeaderField } from './header-search';
import type { HeaderSearch } from './header-search';

function press(key: string, held: { isComposing?: boolean; keyCode?: number } = {}) {
  return { key, isComposing: false, keyCode: 0, ...held };
}

describe('headerFieldKey', () => {
  it('submits on Enter', () => {
    expect(headerFieldKey(press('Enter'), 'moon')).toBe('submit');
  });

  it('clears on Escape while the field holds text', () => {
    expect(headerFieldKey(press('Escape'), 'moon')).toBe('clear');
  });

  it('ignores Escape on an empty field and every other key', () => {
    expect([headerFieldKey(press('Escape'), ''), headerFieldKey(press('a'), 'moon')]).toEqual([
      'ignore',
      'ignore',
    ]);
  });

  it('ignores Enter that confirms an input method composition', () => {
    expect(headerFieldKey(press('Enter', { isComposing: true }), 'つき')).toBe('ignore');
  });

  it('ignores the process key code that Safari sends during composition', () => {
    expect(headerFieldKey(press('Enter', { keyCode: 229 }), 'つき')).toBe('ignore');
  });
});

describe('pressHeaderField', () => {
  function field(value: string) {
    const calls: string[] = [];
    const header: HeaderSearch = {
      placeholder: 'Search',
      disabled: false,
      value,
      oninput: (next) => calls.push(`input:${next}`),
      onsubmit: (next) => calls.push(`submit:${next}`),
    };
    return { header, calls };
  }

  it('submits the held text and prevents the default on Enter', () => {
    const { header, calls } = field('moon');
    let prevented = 0;

    pressHeaderField({ ...press('Enter'), preventDefault: () => (prevented += 1) }, header);

    expect(calls).toEqual(['submit:moon']);
    expect(prevented).toBe(1);
  });

  it('clears the field and prevents the default on Escape', () => {
    const { header, calls } = field('moon');
    let prevented = 0;

    pressHeaderField({ ...press('Escape'), preventDefault: () => (prevented += 1) }, header);

    expect(calls).toEqual(['input:']);
    expect(prevented).toBe(1);
  });

  it('does nothing for any other key', () => {
    const { header, calls } = field('moon');
    let prevented = 0;

    pressHeaderField({ ...press('a'), preventDefault: () => (prevented += 1) }, header);

    expect(calls).toEqual([]);
    expect(prevented).toBe(0);
  });
});
