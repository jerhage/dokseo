import { describe, expect, it } from 'vitest';
import { ensureDisposableStack, StackShim } from './disposable-stack';
import type { StackOwner } from './disposable-stack';

function closing(closed: string[], name: string): Disposable {
  return {
    [Symbol.dispose]: (): void => {
      closed.push(name);
    },
  };
}

describe('ensureDisposableStack', () => {
  it('gives the class to an owner that has none, as Safari has none today', () => {
    const owner: StackOwner = {};

    expect(ensureDisposableStack(owner)).toBe(StackShim);
    expect(owner.DisposableStack).toBe(StackShim);
  });

  it('leaves an owner that already has one alone', () => {
    const native = (): void => undefined;
    const owner: StackOwner = { DisposableStack: native };

    expect(ensureDisposableStack(owner)).toBe(native);
  });
});

describe('StackShim', () => {
  it('disposes what it was given, newest first', () => {
    const closed: string[] = [];
    const stack = new StackShim();

    stack.use(closing(closed, 'first'));
    stack.use(closing(closed, 'second'));
    stack.dispose();

    expect(closed).toEqual(['second', 'first']);
  });

  it('answers the value it was given, so it reads as a pass-through', () => {
    const held = closing([], 'held');

    expect(new StackShim().use(held)).toBe(held);
  });

  it('ignores null and undefined, as the standard does', () => {
    const stack = new StackShim();

    expect(stack.use(null)).toBeNull();
    expect(stack.use(undefined)).toBeUndefined();
    expect(() => stack.dispose()).not.toThrow();
  });

  it('refuses a value that cannot be disposed', () => {
    expect(() => new StackShim().use({})).toThrow(/not disposable/u);
  });

  it('adopts a value that disposes some other way', () => {
    const closed: string[] = [];
    const stack = new StackShim();

    const held = stack.adopt('page', (name) => closed.push(name));
    stack.dispose();

    expect(held).toBe('page');
    expect(closed).toEqual(['page']);
  });

  it('defers plain work', () => {
    const closed: string[] = [];
    const stack = new StackShim();

    stack.defer(() => closed.push('deferred'));
    stack.dispose();

    expect(closed).toEqual(['deferred']);
  });

  it('disposes once, however often it is asked', () => {
    const closed: string[] = [];
    const stack = new StackShim();

    stack.use(closing(closed, 'once'));
    stack.dispose();
    stack.dispose();

    expect(closed).toEqual(['once']);
    expect(stack.disposed).toBe(true);
  });

  it('hands everything to the stack it moves into, and disposes nothing itself', () => {
    const closed: string[] = [];
    const stack = new StackShim();
    stack.use(closing(closed, 'moved'));

    const moved = stack.move();
    stack.dispose();

    expect(closed).toEqual([]);
    expect(stack.disposed).toBe(true);

    moved.dispose();
    expect(closed).toEqual(['moved']);
  });

  it('refuses to take more once disposed', () => {
    const stack = new StackShim();
    stack.dispose();

    expect(() => stack.use(closing([], 'late'))).toThrow(ReferenceError);
  });

  it('disposes through the symbol, which is how using reaches it', () => {
    const closed: string[] = [];
    const stack = new StackShim();
    stack.use(closing(closed, 'held'));

    stack[Symbol.dispose]();

    expect(closed).toEqual(['held']);
  });
});
