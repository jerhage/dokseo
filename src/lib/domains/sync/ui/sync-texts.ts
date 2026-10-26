import { match } from 'ts-pattern';
import type { StatusVariant } from '$lib/ui/components/classes';
import type { RejectionCode } from '../domain/sync-server';
import type { ConnectSyncResult } from '../use-cases/connect-sync';
import type { DisconnectSyncResult, UnrevokedReason } from '../use-cases/disconnect-sync';
import type { RevokeSyncDeviceResult } from '../use-cases/revoke-sync-device';
import type { SyncDevicesResult } from '../use-cases/sync-devices';
import type { SyncNowResult } from '../use-cases/sync-now';

type ConnectFailure = Exclude<ConnectSyncResult, { readonly kind: 'success' }>;

type SyncNowLine = {
  readonly variant: StatusVariant;
  readonly text: string;
  readonly signedOut: boolean;
};

type DevicesFailure = Exclude<SyncDevicesResult, { readonly kind: 'success' }>;

type RevokeOutcome = {
  readonly tone: 'success' | 'warning' | 'danger';
  readonly title: string;
  readonly message: string;
};

type DisconnectOutcome = {
  readonly variant: StatusVariant;
  readonly title: string;
  readonly text: string;
};

const OFFLINE_TEXT =
  'Could not reach the server. Check the address and that this device can reach it.';

const RATE_LIMITED_TEXT =
  'The server is limiting requests from this device. Try again in a few minutes.';

const UNREADABLE_TEXT = 'The server answered with something Dokseo cannot read.';

const SIGNED_OUT_TEXT =
  'The server signed this device out. Disconnect it here, then connect again to keep syncing.';

const STORAGE_TEXT = 'This browser cannot store the connection. A private window does not keep it.';

const NOT_CONNECTED_TEXT = 'This device is not connected to a server.';

function serverErrorText(status: number): string {
  return `The server answered with an error (status ${status}).`;
}

function changeCount(count: number): string {
  return count === 1 ? '1 change' : `${count} changes`;
}

function connectFailureText(failure: ConnectFailure): string {
  return match(failure)
    .returnType<string>()
    .with({ kind: 'invalid-url' }, () => 'Enter the full server address, starting with https://.')
    .with({ kind: 'already-connected' }, () => 'This device is already connected to a server.')
    .with(
      { kind: 'incompatible-server' },
      () =>
        'This server is not compatible with this version of Dokseo. Update the server or Dokseo.',
    )
    .with({ kind: 'storage-unavailable' }, () => STORAGE_TEXT)
    .with({ kind: 'offline' }, () => OFFLINE_TEXT)
    .with({ kind: 'unauthorized' }, () => 'Wrong username or password.')
    .with({ kind: 'rate-limited' }, () => 'Too many attempts. Try again in 15 minutes.')
    .with(
      { kind: 'rejected' },
      () => 'The server refused these details. Check the username and the device name.',
    )
    .with({ kind: 'server-error' }, ({ status }) => serverErrorText(status))
    .with(
      { kind: 'unreadable-response' },
      () => 'That address answered, but it is not a dokseo-sync server.',
    )
    .exhaustive();
}

function rejectionText(code: RejectionCode): string {
  return match(code)
    .returnType<string>()
    .with('invalid-request', () => 'The server did not understand the request.')
    .with('invalid-change', () => 'The server refused a change as malformed.')
    .with('device-mismatch', () => 'The server says a change came from a different device.')
    .with('forbidden', () => 'The server refused a change from this device.')
    .with('too-large', () => 'A change is too large for the server to accept.')
    .exhaustive();
}

function syncDoneText(result: Extract<SyncNowResult, { readonly kind: 'success' }>): string {
  const { pushed, applied, waiting, held, skipped } = result;
  const parts = [`Sent ${changeCount(pushed)}, received ${applied}.`];
  const waits = waiting + held;
  if (waits > 0) {
    parts.push(
      waits === 1 ? '1 change waits for its book.' : `${waits} changes wait for their books.`,
    );
  }
  if (skipped > 0) {
    parts.push(
      `${changeCount(skipped)} could not be read and ${skipped === 1 ? 'was' : 'were'} skipped.`,
    );
  }
  return parts.join(' ');
}

function syncNowLine(result: SyncNowResult): SyncNowLine {
  return match(result)
    .returnType<SyncNowLine>()
    .with({ kind: 'success' }, (done) => ({
      variant: 'success',
      text: syncDoneText(done),
      signedOut: false,
    }))
    .with({ kind: 'not-connected' }, () => ({
      variant: 'warning',
      text: NOT_CONNECTED_TEXT,
      signedOut: false,
    }))
    .with({ kind: 'rejected' }, ({ code }) => ({
      variant: 'danger',
      text: rejectionText(code),
      signedOut: false,
    }))
    .with({ kind: 'storage-unavailable' }, () => ({
      variant: 'danger',
      text: STORAGE_TEXT,
      signedOut: false,
    }))
    .with({ kind: 'offline' }, () => ({
      variant: 'warning',
      text: `${OFFLINE_TEXT} Your changes are kept and go out the next time you sync.`,
      signedOut: false,
    }))
    .with({ kind: 'unauthorized' }, () => ({
      variant: 'warning',
      text: SIGNED_OUT_TEXT,
      signedOut: true,
    }))
    .with({ kind: 'rate-limited' }, () => ({
      variant: 'warning',
      text: RATE_LIMITED_TEXT,
      signedOut: false,
    }))
    .with({ kind: 'server-error' }, ({ status }) => ({
      variant: 'danger',
      text: serverErrorText(status),
      signedOut: false,
    }))
    .with({ kind: 'unreadable-response' }, () => ({
      variant: 'danger',
      text: UNREADABLE_TEXT,
      signedOut: false,
    }))
    .exhaustive();
}

function devicesFailureText(failure: DevicesFailure): string {
  return match(failure)
    .returnType<string>()
    .with({ kind: 'not-connected' }, () => NOT_CONNECTED_TEXT)
    .with({ kind: 'storage-unavailable' }, () => STORAGE_TEXT)
    .with({ kind: 'offline' }, () => OFFLINE_TEXT)
    .with({ kind: 'unauthorized' }, () => SIGNED_OUT_TEXT)
    .with({ kind: 'rate-limited' }, () => RATE_LIMITED_TEXT)
    .with({ kind: 'server-error' }, ({ status }) => serverErrorText(status))
    .with({ kind: 'unreadable-response' }, () => UNREADABLE_TEXT)
    .exhaustive();
}

function revokeOutcome(result: RevokeSyncDeviceResult, deviceName: string): RevokeOutcome {
  const failed = (message: string): RevokeOutcome => ({
    tone: 'warning',
    title: 'Could not revoke that device',
    message,
  });
  return match(result)
    .returnType<RevokeOutcome>()
    .with({ kind: 'success' }, () => ({
      tone: 'success',
      title: 'Device revoked',
      message: `${deviceName} is signed out and no longer syncs.`,
    }))
    .with({ kind: 'own-device' }, () => failed('Use Disconnect to sign this device out.'))
    .with({ kind: 'not-connected' }, () => failed(NOT_CONNECTED_TEXT))
    .with({ kind: 'storage-unavailable' }, () => failed(STORAGE_TEXT))
    .with({ kind: 'offline' }, () => failed(OFFLINE_TEXT))
    .with({ kind: 'unauthorized' }, () => failed(SIGNED_OUT_TEXT))
    .with({ kind: 'rate-limited' }, () => failed(RATE_LIMITED_TEXT))
    .with({ kind: 'not-found' }, () =>
      failed('The server no longer lists that device. It may already be revoked.'),
    )
    .with({ kind: 'server-error' }, ({ status }) => failed(serverErrorText(status)))
    .with({ kind: 'unreadable-response' }, () => failed(UNREADABLE_TEXT))
    .exhaustive();
}

function unrevokedReasonText(reason: UnrevokedReason): string {
  return match(reason)
    .returnType<string>()
    .with('offline', () => 'The server could not be reached.')
    .with(
      'unauthorized',
      () =>
        "The server did not accept this device's sign-in, so it may already be signed out there.",
    )
    .with('rate-limited', () => 'The server was limiting requests.')
    .with('server-error', () => 'The server answered with an error.')
    .with('unreadable-response', () => 'The server answered with something Dokseo cannot read.')
    .exhaustive();
}

function disconnectOutcome(result: DisconnectSyncResult): DisconnectOutcome {
  return match(result)
    .returnType<DisconnectOutcome>()
    .with({ kind: 'disconnected' }, () => ({
      variant: 'success',
      title: 'Disconnected',
      text: 'This device no longer syncs. Its books and captures stay here.',
    }))
    .with({ kind: 'disconnected-unrevoked' }, ({ reason }) => ({
      variant: 'warning',
      title: 'Disconnected here, still listed on the server',
      text: `${unrevokedReasonText(reason)} This device is disconnected here but the server may still list it. To remove it, open Settings, Sync on another connected device and revoke it there.`,
    }))
    .with({ kind: 'not-connected' }, () => ({
      variant: 'info',
      title: 'Not connected',
      text: NOT_CONNECTED_TEXT,
    }))
    .with({ kind: 'storage-unavailable' }, () => ({
      variant: 'danger',
      title: 'Could not disconnect',
      text: STORAGE_TEXT,
    }))
    .exhaustive();
}

export {
  OFFLINE_TEXT,
  STORAGE_TEXT,
  connectFailureText,
  devicesFailureText,
  disconnectOutcome,
  revokeOutcome,
  syncNowLine,
};
export type { ConnectFailure, DevicesFailure, DisconnectOutcome, RevokeOutcome, SyncNowLine };
