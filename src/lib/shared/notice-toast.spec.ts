import { describe, expect, it } from 'vitest';
import type { ToastOptions } from '$lib/ui/components/toaster.svelte';
import { noticeToast, toastNotify } from './notice-toast';

describe('noticeToast', () => {
  it('shows the tone as the toast variant', () => {
    expect(
      (['info', 'success', 'warning', 'danger'] as const).map(
        (tone) => noticeToast({ tone, title: 'Saved' }).variant,
      ),
    ).toEqual(['info', 'success', 'warning', 'danger']);
  });

  it('passes the title and the message through', () => {
    expect(noticeToast({ tone: 'danger', title: 'Not saved', message: 'Try again.' })).toEqual({
      variant: 'danger',
      title: 'Not saved',
      message: 'Try again.',
    });
  });

  it('passes the same action through, so pressing it runs the caller', () => {
    const action = { label: 'Undo', run: () => {} };

    expect(noticeToast({ tone: 'success', title: 'Removed', action }).action).toBe(action);
  });

  it('passes a duration through, so an action toast can leave on its own', () => {
    expect(noticeToast({ tone: 'success', title: 'Removed', duration: 10_000 }).duration).toBe(
      10_000,
    );
  });

  it('leaves out a message and an action the notice does not have', () => {
    expect(Object.keys(noticeToast({ tone: 'info', title: 'Done' }))).toEqual(['variant', 'title']);
  });
});

describe('toastNotify', () => {
  it('shows one toast per notice', () => {
    const shown: ToastOptions[] = [];
    const notify = toastNotify({
      show: (options) => {
        shown.push(options);
        return shown.length;
      },
    });

    notify({ tone: 'warning', title: 'Offline' });

    expect(shown).toEqual([{ variant: 'warning', title: 'Offline' }]);
  });
});
