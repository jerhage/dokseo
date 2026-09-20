const BYTES_PER_MB = 1_000_000;

const BYTES_PER_KB = 1_000;

export function megabytes(bytes: number, decimals = 0): number {
  const scale = 10 ** decimals;
  return Math.round((bytes / BYTES_PER_MB) * scale) / scale;
}

export function storedSize(bytes: number): string {
  return bytes >= BYTES_PER_MB
    ? `${megabytes(bytes)} MB`
    : `${Math.round(bytes / BYTES_PER_KB)} kB`;
}
