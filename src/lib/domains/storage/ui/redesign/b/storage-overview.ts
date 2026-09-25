import type { StorageAccount } from '../../../domain/storage-parts';
import {
  measuredFigure,
  originFigure,
  partFigure,
  unnamedFigure,
  unnamedNote,
} from '../../storage-view.svelte';

type StorageScreenState =
  | { readonly kind: 'reading' }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'ready'; readonly account: StorageAccount };

type BreakdownRow = {
  readonly key: string;
  readonly label: string;
  readonly detail: string;
  readonly figure: string;
  readonly bytes: number | null;
};

type Headline = {
  readonly figure: string;
  readonly caption: string;
};

type Allowance = {
  readonly used: number;
  readonly allowed: number;
};

const UNNAMED_KEY = 'unnamed';

function screenState(account: StorageAccount | null, message: string | null): StorageScreenState {
  if (account !== null) return { kind: 'ready', account };
  if (message !== null) return { kind: 'failed', message };
  return { kind: 'reading' };
}

function bySizeLargestFirst(a: BreakdownRow, b: BreakdownRow): number {
  return (b.bytes ?? -1) - (a.bytes ?? -1);
}

function unnamedRow(account: StorageAccount): readonly BreakdownRow[] {
  const figure = unnamedFigure(account);
  const note = unnamedNote(account);
  if (figure === null || note === null || account.remainder === null) return [];

  return [
    {
      key: UNNAMED_KEY,
      label: 'Other browser storage',
      detail: note,
      figure,
      bytes: account.remainder < 0 ? null : account.remainder,
    },
  ];
}

function breakdownRows(account: StorageAccount): readonly BreakdownRow[] {
  const parts = account.parts
    .map((part) => ({
      key: part.key,
      label: part.label,
      detail: part.detail,
      figure: partFigure(part),
      bytes: part.bytes,
    }))
    .toSorted(bySizeLargestFirst);

  return [...parts, ...unnamedRow(account)];
}

function breakdownScale(account: StorageAccount): number {
  return Math.max(account.usage ?? 0, account.measured);
}

function usedHeadline(account: StorageAccount): Headline {
  const origin = originFigure(account);
  if (origin !== null) return { figure: origin, caption: 'counted by the browser for this app' };

  return {
    figure: measuredFigure(account),
    caption: 'measured by this app; the browser reports no total',
  };
}

function allowanceOf(account: StorageAccount): Allowance | null {
  if (account.usage === null || account.quota === null) return null;
  return { used: account.usage, allowed: account.quota };
}

export { UNNAMED_KEY, allowanceOf, breakdownRows, breakdownScale, screenState, usedHeadline };
export type { Allowance, BreakdownRow, Headline, StorageScreenState };
