import { describe, expect, it } from 'vitest';
import { createToaster } from './toaster.svelte';

describe('Toaster', () => {
  it('starts with no toasts', () => {
    expect(createToaster().toasts).toEqual([]);
  });

  it('shows a toast as info, on the stylesheet duration, unless told otherwise', () => {
    const toaster = createToaster();

    toaster.show({ title: 'Saved' });

    expect(toaster.toasts).toEqual([
      {
        id: 1,
        title: 'Saved',
        message: undefined,
        variant: 'info',
        duration: { kind: 'default' },
        phase: 'shown',
      },
    ]);
  });

  it('stacks toasts in the order they were shown', () => {
    const toaster = createToaster();

    toaster.show({ title: 'First' });
    toaster.show({ title: 'Second' });

    expect(toaster.toasts.map((toast) => toast.title)).toEqual(['First', 'Second']);
  });

  it('gives every toast its own id', () => {
    const toaster = createToaster();

    const ids = [toaster.show({ title: 'A' }), toaster.show({ title: 'B' })];

    expect(new Set(ids).size).toBe(2);
  });

  it('keeps each toaster separate from every other', () => {
    const first = createToaster();
    const second = createToaster();

    first.show({ title: 'Only here' });

    expect(second.toasts).toEqual([]);
  });

  it('keeps a dismissed toast on screen while it leaves', () => {
    const toaster = createToaster();
    const id = toaster.show({ title: 'Saved' });

    toaster.dismiss(id);

    expect(toaster.toasts.map((toast) => toast.phase)).toEqual(['leaving']);
  });

  it('leaves the other toasts alone when one is dismissed', () => {
    const toaster = createToaster();
    const id = toaster.show({ title: 'Going' });
    toaster.show({ title: 'Staying' });

    toaster.dismiss(id);

    expect(toaster.toasts.map((toast) => toast.phase)).toEqual(['leaving', 'shown']);
  });

  it('keeps a leaving toast unchanged when dismissed again', () => {
    const toaster = createToaster();
    const id = toaster.show({ title: 'Saved' });
    toaster.dismiss(id);
    const leaving = toaster.toasts[0];

    toaster.dismiss(id);

    expect(toaster.toasts[0]).toBe(leaving);
  });

  it('removes only the toast that has left', () => {
    const toaster = createToaster();
    const id = toaster.show({ title: 'Going' });
    toaster.show({ title: 'Staying' });

    toaster.remove(id);

    expect(toaster.toasts.map((toast) => toast.title)).toEqual(['Staying']);
  });

  it('removes a toast once it has left', () => {
    const toaster = createToaster();
    const id = toaster.show({ title: 'Saved' });

    toaster.remove(id);

    expect(toaster.toasts).toEqual([]);
  });
});
