import { describe, expect, it } from 'vitest';
import type { ConnectSyncResult } from '../use-cases/connect-sync';
import { connectReady } from './sync-connect-rules';
import { createSyncConnect } from './sync-connect.svelte';

function filled(name = 'Chrome on Mac') {
  const form = createSyncConnect(name);
  form.serverUrl = 'https://sync.example/';
  form.username = 'jh';
  form.password = 'secret';
  return form;
}

describe('connectReady', () => {
  it('needs every field to hold something', () => {
    const fields = {
      serverUrl: 'https://sync.example/',
      username: 'jh',
      password: 'secret',
      deviceName: 'Chrome on Mac',
    };

    expect([
      connectReady(fields),
      connectReady({ ...fields, serverUrl: '  ' }),
      connectReady({ ...fields, username: '' }),
      connectReady({ ...fields, password: '' }),
      connectReady({ ...fields, deviceName: ' ' }),
    ]).toEqual([true, false, false, false, false]);
  });
});

describe('createSyncConnect', () => {
  it('prefills the device name', () => {
    expect(createSyncConnect('Safari on iPhone').deviceName).toBe('Safari on iPhone');
  });

  it('sends the typed details and clears the password after a success', async () => {
    const form = filled();
    const sent: string[][] = [];

    const result = await form.submit(async (...details) => {
      sent.push(details);
      return { kind: 'success', serverUrl: details[0] ?? '', deviceName: details[3] ?? '' };
    });

    expect(sent).toEqual([['https://sync.example/', 'jh', 'secret', 'Chrome on Mac']]);
    expect(result).toMatchObject({ kind: 'success' });
    expect({ password: form.password, phase: form.phase }).toEqual({
      password: '',
      phase: { kind: 'idle' },
    });
  });

  it('words a failure and clears the password', async () => {
    const form = filled();

    await form.submit(async () => ({ kind: 'unauthorized' }));

    expect({ password: form.password, phase: form.phase }).toEqual({
      password: '',
      phase: { kind: 'failed', text: 'Wrong username or password.' },
    });
  });

  it('shows connecting while the attempt runs and refuses a second one', async () => {
    const form = filled();
    let finish: (result: ConnectSyncResult) => void = () => undefined;
    const pending = form.submit(
      () =>
        new Promise<ConnectSyncResult>((resolve) => {
          finish = resolve;
        }),
    );

    const second = await form.submit(async () => ({ kind: 'offline' }));
    expect({ phase: form.phase.kind, connecting: form.connecting, second }).toEqual({
      phase: 'connecting',
      connecting: true,
      second: null,
    });

    finish({ kind: 'offline' });
    await pending;
    expect(form.phase.kind).toBe('failed');
  });

  it('sends nothing while a field is empty', async () => {
    const form = createSyncConnect('Chrome on Mac');

    expect(await form.submit(async () => ({ kind: 'offline' }))).toBeNull();
    expect(form.phase).toEqual({ kind: 'idle' });
  });

  it('returns to idle and clears the password when the attempt throws', async () => {
    const form = filled();

    await expect(
      form.submit(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect({ password: form.password, phase: form.phase }).toEqual({
      password: '',
      phase: { kind: 'idle' },
    });
  });
});
