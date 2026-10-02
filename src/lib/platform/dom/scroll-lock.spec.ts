import { describe, expect, it } from 'vitest';
import { lockScrolling } from './scroll-lock';

function targetOf(overflow = '') {
  return { style: { overflow } };
}

describe('lockScrolling', () => {
  it('hides the overflow of the element it is given', () => {
    const target = targetOf();

    lockScrolling(target);

    expect(target.style.overflow).toBe('hidden');
  });

  it.each(['', 'scroll'])('restores the exact value %j the element already carried', (value) => {
    const target = targetOf(value);

    lockScrolling(target)();

    expect(target.style.overflow).toBe(value);
  });

  it('stays locked until every holder releases', () => {
    const target = targetOf('auto');

    const first = lockScrolling(target);
    const second = lockScrolling(target);
    first();

    expect(target.style.overflow).toBe('hidden');

    second();

    expect(target.style.overflow).toBe('auto');
  });

  it('ignores a second release from the same holder', () => {
    const target = targetOf('auto');
    const release = lockScrolling(target);
    release();

    const other = lockScrolling(target);
    release();

    expect(target.style.overflow).toBe('hidden');

    other();

    expect(target.style.overflow).toBe('auto');
  });

  it('locks an element again after it was restored', () => {
    const target = targetOf('visible');
    lockScrolling(target)();
    target.style.overflow = 'scroll';

    const release = lockScrolling(target);

    expect(target.style.overflow).toBe('hidden');

    release();

    expect(target.style.overflow).toBe('scroll');
  });
});
