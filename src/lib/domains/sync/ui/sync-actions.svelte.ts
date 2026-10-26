import type { DisconnectSyncResult } from '../use-cases/disconnect-sync';
import type { RevokeSyncDeviceResult } from '../use-cases/revoke-sync-device';
import type { SyncNowResult } from '../use-cases/sync-now';
import { disconnectOutcome, revokeOutcome, syncNowLine } from './sync-texts';
import type { DisconnectOutcome, RevokeOutcome, SyncNowLine } from './sync-texts';

type SyncRun =
  | { readonly kind: 'idle' }
  | { readonly kind: 'syncing' }
  | { readonly kind: 'done'; readonly line: SyncNowLine };

type DeviceTarget = { readonly deviceId: string; readonly deviceName: string };

type SyncConfirm =
  | { readonly kind: 'none' }
  | { readonly kind: 'revoke'; readonly device: DeviceTarget }
  | { readonly kind: 'disconnect' };

const IDLE: SyncRun = { kind: 'idle' };

const SYNCING: SyncRun = { kind: 'syncing' };

const NO_CONFIRM: SyncConfirm = { kind: 'none' };

function createSyncActions() {
  let run = $state.raw<SyncRun>(IDLE);
  let confirm = $state.raw<SyncConfirm>(NO_CONFIRM);
  let confirming = $state(false);

  const syncing = $derived(run.kind === 'syncing');

  async function syncNow(sync: () => Promise<SyncNowResult>): Promise<void> {
    if (syncing) return;
    run = SYNCING;
    try {
      const result = await sync();
      run = { kind: 'done', line: syncNowLine(result) };
    } catch (cause) {
      run = IDLE;
      throw cause;
    }
  }

  function askRevoke(device: DeviceTarget): void {
    confirm = { kind: 'revoke', device };
  }

  function askDisconnect(): void {
    confirm = { kind: 'disconnect' };
  }

  function dismiss(): void {
    if (confirming) return;
    confirm = NO_CONFIRM;
  }

  async function confirmRevoke(
    revoke: (deviceId: string) => Promise<RevokeSyncDeviceResult>,
  ): Promise<RevokeOutcome | null> {
    if (confirm.kind !== 'revoke' || confirming) return null;
    const { device } = confirm;
    confirming = true;
    try {
      const result = await revoke(device.deviceId);
      confirm = NO_CONFIRM;
      return revokeOutcome(result, device.deviceName);
    } finally {
      confirming = false;
    }
  }

  async function confirmDisconnect(
    disconnect: () => Promise<DisconnectSyncResult>,
  ): Promise<DisconnectOutcome | null> {
    if (confirm.kind !== 'disconnect' || confirming) return null;
    confirming = true;
    try {
      const result = await disconnect();
      confirm = NO_CONFIRM;
      return disconnectOutcome(result);
    } finally {
      confirming = false;
    }
  }

  return {
    get run() {
      return run;
    },
    get confirm() {
      return confirm;
    },
    get syncing() {
      return syncing;
    },
    get confirming() {
      return confirming;
    },
    syncNow,
    askRevoke,
    askDisconnect,
    dismiss,
    confirmRevoke,
    confirmDisconnect,
  };
}

export { createSyncActions };
export type { DeviceTarget, SyncConfirm, SyncRun };
