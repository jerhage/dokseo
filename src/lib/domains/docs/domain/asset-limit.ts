const CLOUDFLARE_ASSET_LIMIT_BYTES = 25 * 1024 * 1024;

type PackedFile = {
  readonly name: string;
  readonly bytes: number;
};

function fitsOneAsset(file: PackedFile): boolean {
  return file.bytes <= CLOUDFLARE_ASSET_LIMIT_BYTES;
}

function totalBytes(files: readonly PackedFile[]): number {
  return files.reduce((sum, file) => sum + file.bytes, 0);
}

function mebibytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

export { CLOUDFLARE_ASSET_LIMIT_BYTES, fitsOneAsset, mebibytes, totalBytes };
export type { PackedFile };
