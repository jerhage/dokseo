type SealedPassword = {
  readonly iv: Uint8Array;
  readonly ciphertext: ArrayBuffer;
};

type OpenedPassword =
  | { readonly kind: 'success'; readonly password: string }
  | { readonly kind: 'unreadable' };

const ALGORITHM = 'AES-GCM';

const IV_BYTES = 12;

function createPasswordKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: ALGORITHM, length: 256 }, false, ['encrypt', 'decrypt']);
}

async function sealPassword(key: CryptoKey, password: string): Promise<SealedPassword> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    new TextEncoder().encode(password),
  );
  return { iv, ciphertext };
}

function isOperationError(cause: unknown): boolean {
  return cause instanceof DOMException && cause.name === 'OperationError';
}

async function openPassword(key: CryptoKey, sealed: SealedPassword): Promise<OpenedPassword> {
  try {
    const plain = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv: new Uint8Array(sealed.iv) },
      key,
      sealed.ciphertext,
    );
    return { kind: 'success', password: new TextDecoder().decode(plain) };
  } catch (cause) {
    if (isOperationError(cause)) return { kind: 'unreadable' };
    throw cause;
  }
}

export { createPasswordKey, openPassword, sealPassword };
export type { OpenedPassword, SealedPassword };
