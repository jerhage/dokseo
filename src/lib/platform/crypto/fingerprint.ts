const FINGERPRINT_SAMPLE_BYTES = 1024 * 1024;

const FINGERPRINT_WHOLE_UP_TO = FINGERPRINT_SAMPLE_BYTES * 2;

const SIZE_HEADER_BYTES = 8;

function sizeHeader(size: number): Uint8Array<ArrayBuffer> {
  const header = new Uint8Array(SIZE_HEADER_BYTES);
  new DataView(header.buffer).setBigUint64(0, BigInt(size));
  return header;
}

function sampledParts(blob: Blob): readonly Blob[] {
  if (blob.size <= FINGERPRINT_WHOLE_UP_TO) return [blob];
  return [
    blob.slice(0, FINGERPRINT_SAMPLE_BYTES),
    blob.slice(blob.size - FINGERPRINT_SAMPLE_BYTES),
  ];
}

function joined(header: Uint8Array, samples: readonly ArrayBuffer[]): Uint8Array<ArrayBuffer> {
  const total = samples.reduce((sum, sample) => sum + sample.byteLength, header.byteLength);
  const bytes = new Uint8Array(total);
  bytes.set(header);
  let offset = header.byteLength;
  for (const sample of samples) {
    bytes.set(new Uint8Array(sample), offset);
    offset += sample.byteLength;
  }
  return bytes;
}

function hex(digest: ArrayBuffer): string {
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function fingerprintOf(blob: Blob): Promise<string> {
  const samples = await Promise.all(sampledParts(blob).map((part) => part.arrayBuffer()));
  const digest = await crypto.subtle.digest('SHA-256', joined(sizeHeader(blob.size), samples));
  return hex(digest);
}

export { FINGERPRINT_SAMPLE_BYTES, FINGERPRINT_WHOLE_UP_TO, fingerprintOf };
