const KIB = 1024;

const MIB = KIB * KIB;

const GIB = MIB * KIB;

function scaled(bytes: number, unit: number, name: string): string {
  return `${(bytes / unit).toLocaleString('en-US', { maximumFractionDigits: 1 })} ${name}`;
}

function byteCount(bytes: number): string {
  if (bytes < KIB) return bytes === 1 ? '1 byte' : `${bytes.toLocaleString('en-US')} bytes`;
  if (bytes < MIB) return scaled(bytes, KIB, 'KiB');
  if (bytes < GIB) return scaled(bytes, MIB, 'MiB');
  return scaled(bytes, GIB, 'GiB');
}

function elapsed(ms: number): string {
  return ms < 10 ? `${ms.toFixed(1)} ms` : `${Math.round(ms).toLocaleString('en-US')} ms`;
}

export { byteCount, elapsed };
