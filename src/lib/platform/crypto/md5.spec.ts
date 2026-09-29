import { describe, expect, it } from 'vitest';
import { Md5 } from './md5';

const encoder = new TextEncoder();

function md5Of(text: string): string {
  const md5 = new Md5();
  md5.update(encoder.encode(text));
  return md5.hexDigest();
}

const RFC_1321_SUITE: readonly (readonly [string, string])[] = [
  ['', 'd41d8cd98f00b204e9800998ecf8427e'],
  ['a', '0cc175b9c0f1b6a831c399e269772661'],
  ['abc', '900150983cd24fb0d6963f7d28e17f72'],
  ['message digest', 'f96b697d7cb7938d525a2f31aaf161d0'],
  ['abcdefghijklmnopqrstuvwxyz', 'c3fcd3d76192e4007dfb496cca67e13b'],
  [
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    'd174ab98d277d9f5a5611c2c9f419d9f',
  ],
  ['1234567890'.repeat(8), '57edf4a22be3c955ac49da2e2107b67a'],
];

const PADDING_EDGES: readonly (readonly [number, string])[] = [
  [55, '04364420e25c512fd958a70738aa8f72'],
  [56, '668a72d5ba17f08e62dabcafad6db14b'],
  [63, '7dc2ca208106a2f703567bdff99d8981'],
  [64, 'c1bb4f81d892b2d57947682aeb252456'],
  [65, '1bc932052302d074bdec39795fe00cf6'],
];

describe('Md5', () => {
  it.each(RFC_1321_SUITE)('digests %j as the RFC 1321 test suite gives', (text, expected) => {
    expect(md5Of(text)).toBe(expected);
  });

  it.each(PADDING_EDGES)('pads a message of %i bytes as hashlib does', (length, expected) => {
    expect(md5Of('x'.repeat(length))).toBe(expected);
  });

  it('digests a million bytes fed in uneven pieces as one', () => {
    const md5 = new Md5();
    const piece = encoder.encode('a'.repeat(997));
    let fed = 0;
    while (fed + piece.byteLength <= 1_000_000) {
      md5.update(piece);
      fed += piece.byteLength;
    }
    md5.update(encoder.encode('a'.repeat(1_000_000 - fed)));

    expect(md5.hexDigest()).toBe('7707d6ae4e027c70eea2a935c2296f21');
  });

  it('gives the same digest for a message fed byte by byte', () => {
    const md5 = new Md5();
    for (const byte of encoder.encode('message digest')) md5.update(Uint8Array.of(byte));

    expect(md5.hexDigest()).toBe('f96b697d7cb7938d525a2f31aaf161d0');
  });

  it('leaves the running digest untouched when read', () => {
    const md5 = new Md5();
    md5.update(encoder.encode('ab'));
    md5.hexDigest();
    md5.update(encoder.encode('c'));

    expect(md5.hexDigest()).toBe('900150983cd24fb0d6963f7d28e17f72');
  });
});
