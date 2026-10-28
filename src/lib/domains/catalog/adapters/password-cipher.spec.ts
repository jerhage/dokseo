import { describe, expect, it } from 'vitest';
import { createPasswordKey, openPassword, sealPassword } from './password-cipher';

describe('password cipher', () => {
  it('opens what it sealed', async () => {
    const key = await createPasswordKey();

    const sealed = await sealPassword(key, 'pässword 秘密');

    expect(await openPassword(key, sealed)).toEqual({ kind: 'success', password: 'pässword 秘密' });
  });

  it('draws a fresh iv for every seal', async () => {
    const key = await createPasswordKey();

    const first = await sealPassword(key, 'secret');
    const second = await sealPassword(key, 'secret');

    expect(first.iv).not.toEqual(second.iv);
    expect(new Uint8Array(first.ciphertext)).not.toEqual(new Uint8Array(second.ciphertext));
  });

  it('reports a different key as unreadable', async () => {
    const sealed = await sealPassword(await createPasswordKey(), 'secret');

    expect(await openPassword(await createPasswordKey(), sealed)).toEqual({ kind: 'unreadable' });
  });

  it('creates a key that cannot be exported', async () => {
    const key = await createPasswordKey();

    expect(key.extractable).toBe(false);
  });
});
