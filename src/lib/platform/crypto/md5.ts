const BLOCK_BYTES = 64;

const LENGTH_BYTES = 8;

const INITIAL_STATE = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476] as const;

const SHIFTS = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14,
  20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6,
  10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
] as const;

const SINE_CONSTANTS: readonly number[] = Array.from(
  { length: 64 },
  (_, step) => Math.floor(Math.abs(Math.sin(step + 1)) * 2 ** 32) >>> 0,
);

type RoundMix = {
  readonly mix: (b: number, c: number, d: number) => number;
  readonly word: (step: number) => number;
};

const ROUNDS: readonly RoundMix[] = [
  { mix: (b, c, d) => (b & c) | (~b & d), word: (step) => step },
  { mix: (b, c, d) => (d & b) | (~d & c), word: (step) => (5 * step + 1) % 16 },
  { mix: (b, c, d) => b ^ c ^ d, word: (step) => (3 * step + 5) % 16 },
  { mix: (b, c, d) => c ^ (b | ~d), word: (step) => (7 * step) % 16 },
];

function rotateLeft(value: number, count: number): number {
  return (value << count) | (value >>> (32 - count));
}

function sineConstant(step: number): number {
  return SINE_CONSTANTS[step] ?? 0;
}

function shift(step: number): number {
  return SHIFTS[step] ?? 0;
}

function compress(state: Uint32Array, block: Uint8Array<ArrayBuffer>): void {
  const view = new DataView(block.buffer, block.byteOffset, BLOCK_BYTES);
  const words = Array.from({ length: 16 }, (_, index) => view.getUint32(index * 4, true));
  let [a = 0, b = 0, c = 0, d = 0] = state;

  for (const [round, { mix, word }] of ROUNDS.entries()) {
    for (let within = 0; within < 16; within += 1) {
      const step = round * 16 + within;
      const sum = (a + mix(b, c, d) + sineConstant(step) + (words[word(step)] ?? 0)) | 0;
      a = d;
      d = c;
      c = b;
      b = (b + rotateLeft(sum, shift(step))) | 0;
    }
  }

  state[0] = (state[0] ?? 0) + a;
  state[1] = (state[1] ?? 0) + b;
  state[2] = (state[2] ?? 0) + c;
  state[3] = (state[3] ?? 0) + d;
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

class Md5 {
  readonly #state = Uint32Array.from(INITIAL_STATE);

  readonly #pending = new Uint8Array(BLOCK_BYTES);

  #pendingLength = 0;

  #byteCount = 0;

  update(bytes: Uint8Array): void {
    this.#byteCount += bytes.byteLength;
    let read = 0;
    while (read < bytes.byteLength) {
      const taken = Math.min(BLOCK_BYTES - this.#pendingLength, bytes.byteLength - read);
      this.#pending.set(bytes.subarray(read, read + taken), this.#pendingLength);
      this.#pendingLength += taken;
      read += taken;
      if (this.#pendingLength === BLOCK_BYTES) {
        compress(this.#state, this.#pending);
        this.#pendingLength = 0;
      }
    }
  }

  digest(): Uint8Array<ArrayBuffer> {
    const state = Uint32Array.from(this.#state);
    const paddedLength =
      this.#pendingLength < BLOCK_BYTES - LENGTH_BYTES ? BLOCK_BYTES : BLOCK_BYTES * 2;
    const tail = new Uint8Array(paddedLength);
    tail.set(this.#pending.subarray(0, this.#pendingLength));
    tail[this.#pendingLength] = 0x80;
    const bitCount = BigInt(this.#byteCount) * 8n;
    new DataView(tail.buffer).setBigUint64(paddedLength - LENGTH_BYTES, bitCount, true);
    for (let offset = 0; offset < paddedLength; offset += BLOCK_BYTES) {
      compress(state, tail.subarray(offset, offset + BLOCK_BYTES));
    }

    const digest = new Uint8Array(16);
    const view = new DataView(digest.buffer);
    for (const [index, word] of state.entries()) view.setUint32(index * 4, word, true);
    return digest;
  }

  hexDigest(): string {
    return hex(this.digest());
  }
}

export { Md5 };
