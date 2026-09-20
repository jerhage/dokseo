import type { StoredFile } from './origin-stores';

export type StoragePart = {
  readonly key: string;
  readonly label: string;
  readonly detail: string;
  readonly bytes: number | null;
};

export type OriginSpace = { readonly usage: number; readonly quota: number } | null;

export type StorageAccount = {
  readonly parts: readonly StoragePart[];
  readonly measured: number;
  readonly unmeasured: readonly StoragePart[];
  readonly usage: number | null;
  readonly quota: number | null;
  readonly remainder: number | null;
  readonly persisted: boolean;
};

export type Tally = {
  readonly files: number;
  readonly bytes: number;
  readonly unsized: number;
};

export function tallyOf(held: readonly { readonly bytes: number | null }[]): Tally {
  return {
    files: held.length,
    bytes: held.reduce((total, one) => total + (one.bytes ?? 0), 0),
    unsized: held.filter((one) => one.bytes === null).length,
  };
}

export function fileCount(files: number): string {
  return `${files} ${files === 1 ? 'file' : 'files'}`;
}

export function tallyDetail(tally: Tally): string {
  const unsized = tally.unsized > 0 ? `, ${tally.unsized} of unreported size` : '';
  return `${fileCount(tally.files)}${unsized}`;
}

export function filesAt(files: readonly StoredFile[], place: string): readonly StoredFile[] {
  return files.filter((file) => file.place === place);
}

export function filesElsewhere(
  files: readonly StoredFile[],
  places: readonly string[],
): readonly StoredFile[] {
  return files.filter((file) => !places.includes(file.place));
}

export function measuredBytes(parts: readonly StoragePart[]): number {
  return parts.reduce((total, part) => total + (part.bytes ?? 0), 0);
}

export function unmeasuredParts(parts: readonly StoragePart[]): readonly StoragePart[] {
  return parts.filter((part) => part.bytes === null);
}

export function accountOf(
  parts: readonly StoragePart[],
  space: OriginSpace,
  persisted: boolean,
): StorageAccount {
  const measured = measuredBytes(parts);

  return {
    parts,
    measured,
    unmeasured: unmeasuredParts(parts),
    usage: space?.usage ?? null,
    quota: space?.quota ?? null,
    remainder: space === null ? null : space.usage - measured,
    persisted,
  };
}
