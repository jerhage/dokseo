import { describe, expect, it } from 'vitest';
import { catalogId } from '$lib/shared/ids';
import { SessionCatalogPasswords } from './session-catalog-passwords';

const CALIBRE = catalogId('calibre');

describe('SessionCatalogPasswords', () => {
  it('answers null for a catalog never unlocked', () => {
    expect(new SessionCatalogPasswords().get(CALIBRE)).toBeNull();
  });

  it('holds a password per catalog until it is forgotten', () => {
    const passwords = new SessionCatalogPasswords();
    passwords.set(CALIBRE, 'secret');
    passwords.set(catalogId('other'), 'another');

    expect(passwords.get(CALIBRE)).toBe('secret');

    passwords.forget(CALIBRE);

    expect(passwords.get(CALIBRE)).toBeNull();
    expect(passwords.get(catalogId('other'))).toBe('another');
  });
});
