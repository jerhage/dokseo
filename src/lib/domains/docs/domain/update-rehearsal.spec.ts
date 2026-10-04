import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { createToaster } from '$lib/components/toaster.svelte';
import type { Toast, Toaster } from '$lib/components/toaster.svelte';
import { SHELL_UPDATE_ACTION } from '$lib/shared/shell-updates';
import {
  CHECK_DETAILS,
  CHECK_KINDS,
  RELOAD_OFFER,
  STAND_IN_FAILURE,
  checkOutcomes,
  rehearse,
} from './update-rehearsal';

let logged: MockInstance<typeof console.error>;

beforeEach(() => {
  logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  logged.mockRestore();
});

function showing(toaster: Toaster): readonly Toast[] {
  return toaster.toasts.filter((toast) => toast.phase === 'shown');
}

describe('rehearse', () => {
  const kinds = checkOutcomes().map((outcome) => outcome.kind);

  it('lists every outcome once', () => {
    expect(CHECK_KINDS.toSorted()).toEqual(Object.keys(CHECK_DETAILS).toSorted());
  });

  it.each(kinds)('returns the %s outcome from the real checkNow', async (kind) => {
    const toaster = createToaster();
    const check = await rehearse(kind, toaster, () => undefined).start();

    expect(check.kind).toBe(kind);
  });

  it.each(kinds)('shows the toast listed for %s', async (kind) => {
    const toaster = createToaster();
    const listed = CHECK_DETAILS[kind].toast;

    await rehearse(kind, toaster, () => undefined).start();

    const shown = showing(toaster);
    expect(shown).toHaveLength(1);
    expect(shown[0]).toMatchObject({ variant: listed.variant, title: listed.title });
    expect(shown[0]?.action?.label).toBe(listed.reload ? SHELL_UPDATE_ACTION : undefined);
  });

  it('logs the unexpected failure with its message', async () => {
    const toaster = createToaster();

    await rehearse('unexpected', toaster, () => undefined).start();

    expect(logged).toHaveBeenCalledOnce();
    expect(showing(toaster)[0]?.message).toContain(STAND_IN_FAILURE);
  });

  it('replaces the download toast with the Reload offer once the worker installs', async () => {
    const toaster = createToaster();
    const rehearsal = rehearse('found', toaster, () => undefined);
    await rehearsal.start();

    rehearsal.found?.become('installed');

    const shown = showing(toaster);
    expect(shown).toHaveLength(1);
    expect(shown[0]).toMatchObject({ variant: RELOAD_OFFER.variant, title: RELOAD_OFFER.title });
  });

  it('reloads once after Reload, when the new worker takes control', async () => {
    const toaster = createToaster();
    const reload = vi.fn();
    const rehearsal = rehearse('found', toaster, reload);
    await rehearsal.start();
    rehearsal.found?.become('installed');
    const offer = showing(toaster)[0];
    if (offer === undefined) throw new Error('no offer');

    toaster.act(offer.id);

    expect(reload).toHaveBeenCalledOnce();
    expect(rehearsal.found?.state).toBe('activated');
  });

  it('reports a failed download when the found worker turns redundant', async () => {
    const toaster = createToaster();
    const rehearsal = rehearse('found', toaster, () => undefined);
    await rehearsal.start();

    rehearsal.found?.become('redundant');

    expect(showing(toaster)[0]?.title).toBe(CHECK_DETAILS['download-failed'].toast.title);
  });
});
