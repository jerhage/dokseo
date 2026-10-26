import { describe, expect, it } from 'vitest';
import type { SyncNowResult } from '../use-cases/sync-now';
import { createSyncActions } from './sync-actions.svelte';

const SENT: SyncNowResult = {
  kind: 'success',
  pushed: 3,
  waiting: 0,
  applied: 5,
  held: 0,
  skipped: 0,
  downloaded: 0,
  downloadFailed: 0,
};

describe('createSyncActions', () => {
  it('words the sync result once it settles', async () => {
    const actions = createSyncActions();

    await actions.syncNow(async () => SENT);

    expect(actions.run).toEqual({
      kind: 'done',
      line: { variant: 'success', text: 'Sent 3 changes, received 5.', signedOut: false },
    });
  });

  it('shows syncing while it runs and starts no second run', async () => {
    const actions = createSyncActions();
    let finish: (result: SyncNowResult) => void = () => undefined;
    let starts = 0;
    const run = () => {
      starts += 1;
      return new Promise<SyncNowResult>((resolve) => {
        finish = resolve;
      });
    };

    const first = actions.syncNow(run);
    await actions.syncNow(run);
    expect({ syncing: actions.syncing, starts }).toEqual({ syncing: true, starts: 1 });

    finish(SENT);
    await first;
    expect(actions.syncing).toBe(false);
  });

  it('asks before revoking and revokes the named device once confirmed', async () => {
    const actions = createSyncActions();
    const revoked: string[] = [];

    actions.askRevoke({ deviceId: 'd2', deviceName: 'Phone' });
    expect(actions.confirm.kind).toBe('revoke');
    const outcome = await actions.confirmRevoke(async (id) => {
      revoked.push(id);
      return { kind: 'success' };
    });

    expect(revoked).toEqual(['d2']);
    expect(outcome).toMatchObject({ tone: 'success', title: 'Device revoked' });
    expect(actions.confirm.kind).toBe('none');
  });

  it('keeps the dialog off when nothing was asked', async () => {
    const actions = createSyncActions();

    expect(await actions.confirmRevoke(async () => ({ kind: 'success' }))).toBeNull();
    expect(await actions.confirmDisconnect(async () => ({ kind: 'disconnected' }))).toBeNull();
  });

  it('dismisses a confirm and disconnects when confirmed', async () => {
    const actions = createSyncActions();

    actions.askDisconnect();
    actions.dismiss();
    expect(actions.confirm.kind).toBe('none');

    actions.askDisconnect();
    const outcome = await actions.confirmDisconnect(async () => ({ kind: 'disconnected' }));
    expect(outcome).toMatchObject({ variant: 'success', title: 'Disconnected' });
    expect(actions.confirm.kind).toBe('none');
  });
});
