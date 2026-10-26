import type { ConnectSyncResult } from '../use-cases/connect-sync';
import { connectReady } from './sync-connect-rules';
import type { ConnectSync } from './sync-deps';
import { connectFailureText } from './sync-texts';

type ConnectPhase =
  | { readonly kind: 'idle' }
  | { readonly kind: 'connecting' }
  | { readonly kind: 'failed'; readonly text: string };

const IDLE: ConnectPhase = { kind: 'idle' };

const CONNECTING: ConnectPhase = { kind: 'connecting' };

function createSyncConnect(initialDeviceName: string) {
  let serverUrl = $state('');
  let username = $state('');
  let password = $state('');
  let deviceName = $state(initialDeviceName);
  let phase = $state.raw<ConnectPhase>(IDLE);

  const ready = $derived(connectReady({ serverUrl, username, password, deviceName }));
  const connecting = $derived(phase.kind === 'connecting');

  async function submit(connect: ConnectSync): Promise<ConnectSyncResult | null> {
    if (connecting || !ready) return null;
    phase = CONNECTING;
    try {
      const result = await connect(serverUrl, username, password, deviceName);
      phase =
        result.kind === 'success' ? IDLE : { kind: 'failed', text: connectFailureText(result) };
      return result;
    } catch (cause) {
      phase = IDLE;
      throw cause;
    } finally {
      password = '';
    }
  }

  return {
    get serverUrl() {
      return serverUrl;
    },
    set serverUrl(next: string) {
      serverUrl = next;
    },
    get username() {
      return username;
    },
    set username(next: string) {
      username = next;
    },
    get password() {
      return password;
    },
    set password(next: string) {
      password = next;
    },
    get deviceName() {
      return deviceName;
    },
    set deviceName(next: string) {
      deviceName = next;
    },
    get phase() {
      return phase;
    },
    get ready() {
      return ready;
    },
    get connecting() {
      return connecting;
    },
    submit,
  };
}

export { createSyncConnect };
export type { ConnectPhase };
