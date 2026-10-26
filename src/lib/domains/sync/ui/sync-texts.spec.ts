import { describe, expect, it } from 'vitest';
import type { ConnectFailure } from './sync-texts';
import {
  connectFailureText,
  devicesFailureText,
  disconnectOutcome,
  revokeOutcome,
  syncNowLine,
} from './sync-texts';

describe('connectFailureText', () => {
  it('words each failure on its own', () => {
    const failures: readonly ConnectFailure[] = [
      { kind: 'invalid-url' },
      { kind: 'already-connected' },
      { kind: 'incompatible-server' },
      { kind: 'storage-unavailable' },
      { kind: 'offline' },
      { kind: 'unauthorized' },
      { kind: 'rate-limited' },
      { kind: 'rejected', code: 'invalid-request', index: null },
      { kind: 'server-error', status: 502 },
      { kind: 'unreadable-response' },
    ];

    const texts = failures.map(connectFailureText);

    expect(new Set(texts).size).toBe(failures.length);
    expect(texts[4]).toBe(
      'Could not reach the server. Check the address and that this device can reach it.',
    );
    expect(texts[5]).toBe('Wrong username or password.');
    expect(texts[6]).toBe('Too many attempts. Try again in 15 minutes.');
    expect(texts[8]).toContain('status 502');
    expect(texts[9]).toBe('That address answered, but it is not a dokseo-sync server.');
  });
});

describe('syncNowLine', () => {
  it('counts what was sent and received', () => {
    expect(
      syncNowLine({ kind: 'success', pushed: 1, waiting: 0, applied: 0, held: 0, skipped: 0 }),
    ).toEqual({ variant: 'success', text: 'Sent 1 change, received 0.', signedOut: false });
  });

  it('adds the changes that wait for their books, outgoing and incoming together', () => {
    const line = syncNowLine({
      kind: 'success',
      pushed: 3,
      waiting: 1,
      applied: 5,
      held: 1,
      skipped: 0,
    });

    expect(line.text).toBe('Sent 3 changes, received 5. 2 changes wait for their books.');
  });

  it('names a single waiting change and the skipped ones', () => {
    const line = syncNowLine({
      kind: 'success',
      pushed: 0,
      waiting: 0,
      applied: 0,
      held: 1,
      skipped: 2,
    });

    expect(line.text).toBe(
      'Sent 0 changes, received 0. 1 change waits for its book. 2 changes could not be read and were skipped.',
    );
  });

  it('offers a disconnect only when the server signed this device out', () => {
    expect(syncNowLine({ kind: 'unauthorized' })).toMatchObject({ signedOut: true });
    expect(syncNowLine({ kind: 'offline' })).toMatchObject({ signedOut: false });
  });

  it('words each other failure on its own', () => {
    const lines = [
      syncNowLine({ kind: 'not-connected' }),
      syncNowLine({ kind: 'rejected', code: 'too-large', record: null }),
      syncNowLine({ kind: 'storage-unavailable' }),
      syncNowLine({ kind: 'offline' }),
      syncNowLine({ kind: 'unauthorized' }),
      syncNowLine({ kind: 'rate-limited' }),
      syncNowLine({ kind: 'server-error', status: 500 }),
      syncNowLine({ kind: 'unreadable-response' }),
    ];

    expect(new Set(lines.map((line) => line.text)).size).toBe(lines.length);
    expect(lines[1]?.text).toBe('A change is too large for the server to accept.');
  });
});

describe('devicesFailureText', () => {
  it('words each failure on its own', () => {
    const texts = [
      devicesFailureText({ kind: 'not-connected' }),
      devicesFailureText({ kind: 'storage-unavailable' }),
      devicesFailureText({ kind: 'offline' }),
      devicesFailureText({ kind: 'unauthorized' }),
      devicesFailureText({ kind: 'rate-limited' }),
      devicesFailureText({ kind: 'server-error', status: 503 }),
      devicesFailureText({ kind: 'unreadable-response' }),
    ];

    expect(new Set(texts).size).toBe(texts.length);
  });
});

describe('revokeOutcome', () => {
  it('names the device it signed out', () => {
    expect(revokeOutcome({ kind: 'success' }, 'Phone')).toEqual({
      tone: 'success',
      title: 'Device revoked',
      message: 'Phone is signed out and no longer syncs.',
    });
  });

  it('words each failure on its own', () => {
    const outcomes = [
      revokeOutcome({ kind: 'own-device' }, 'Phone'),
      revokeOutcome({ kind: 'not-connected' }, 'Phone'),
      revokeOutcome({ kind: 'storage-unavailable' }, 'Phone'),
      revokeOutcome({ kind: 'offline' }, 'Phone'),
      revokeOutcome({ kind: 'unauthorized' }, 'Phone'),
      revokeOutcome({ kind: 'rate-limited' }, 'Phone'),
      revokeOutcome({ kind: 'not-found' }, 'Phone'),
      revokeOutcome({ kind: 'server-error', status: 500 }, 'Phone'),
      revokeOutcome({ kind: 'unreadable-response' }, 'Phone'),
    ];

    expect(new Set(outcomes.map((outcome) => outcome.message)).size).toBe(outcomes.length);
    expect(outcomes.every((outcome) => outcome.tone === 'warning')).toBe(true);
  });
});

describe('disconnectOutcome', () => {
  it('says the device still sits on the server when the revoke failed', () => {
    const outcome = disconnectOutcome({ kind: 'disconnected-unrevoked', reason: 'offline' });

    expect(outcome.variant).toBe('warning');
    expect(outcome.text).toContain('the server may still list it');
    expect(outcome.text).toContain('revoke it there');
  });

  it('words the other results on their own', () => {
    const titles = [
      disconnectOutcome({ kind: 'disconnected' }).title,
      disconnectOutcome({ kind: 'not-connected' }).title,
      disconnectOutcome({ kind: 'storage-unavailable' }).title,
    ];

    expect(new Set(titles).size).toBe(3);
  });
});
