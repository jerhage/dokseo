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
        action: undefined,
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

  it('keeps a toast with an action up until it is dismissed', () => {
    const toaster = createToaster();

    toaster.show({ title: 'Removed', action: { label: 'Undo', run: () => {} } });

    expect(toaster.toasts[0]?.duration).toEqual({ kind: 'persistent' });
  });

  it('times a toast with an action when a duration is asked for', () => {
    const toaster = createToaster();

    toaster.show({ title: 'Removed', duration: 8000, action: { label: 'Undo', run: () => {} } });

    expect(toaster.toasts[0]?.duration).toEqual({ kind: 'timed', ms: 8000 });
  });

  it('runs the action once and dismisses its toast when acted on', () => {
    const toaster = createToaster();
    let runs = 0;
    const id = toaster.show({
      title: 'Removed',
      action: { label: 'Undo', run: () => (runs += 1) },
    });

    toaster.act(id);
    toaster.act(id);

    expect([runs, toaster.toasts[0]?.phase]).toEqual([1, 'leaving']);
  });

  it('dismisses the toast even when its action throws', () => {
    const toaster = createToaster();
    const id = toaster.show({
      title: 'Removed',
      action: {
        label: 'Undo',
        run: () => {
          throw new Error('failed');
        },
      },
    });

    expect(() => toaster.act(id)).toThrow('failed');
    expect(toaster.toasts[0]?.phase).toBe('leaving');
  });

  it('does nothing when acting on a toast with no action', () => {
    const toaster = createToaster();
    const id = toaster.show({ title: 'Saved' });

    toaster.act(id);

    expect(toaster.toasts[0]?.phase).toBe('shown');
  });

  it('shows toasts in the region attached last', () => {
    const toaster = createToaster();
    toaster.attachRegion();
    const modal = toaster.attachRegion();

    expect(toaster.activeRegion).toBe(modal);
  });

  it('hands the toasts back to the earlier region when the last one detaches', () => {
    const toaster = createToaster();
    const page = toaster.attachRegion();
    const modal = toaster.attachRegion();

    toaster.detachRegion(modal);

    expect(toaster.activeRegion).toBe(page);
  });

  it('keeps the last region active when an earlier one detaches', () => {
    const toaster = createToaster();
    const page = toaster.attachRegion();
    const modal = toaster.attachRegion();

    toaster.detachRegion(page);

    expect(toaster.activeRegion).toBe(modal);
  });

  it('reports no active region before one attaches', () => {
    expect(createToaster().activeRegion).toBeUndefined();
  });

  it('clears the tallest reserved space at the block end', () => {
    const toaster = createToaster();
    toaster.reserveBlockEnd(48);
    toaster.reserveBlockEnd(120);

    expect(toaster.clearance).toBe(120);
  });

  it('drops a reservation once it is released', () => {
    const toaster = createToaster();
    toaster.reserveBlockEnd(48);
    const release = toaster.reserveBlockEnd(120);

    release();

    expect(toaster.clearance).toBe(48);
  });

  it('clears nothing with no reservation', () => {
    expect(createToaster().clearance).toBe(0);
  });
});
