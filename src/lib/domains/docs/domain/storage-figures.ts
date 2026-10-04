import { match } from 'ts-pattern';

type PersistOutcome =
  | { readonly kind: 'unsupported' }
  | { readonly kind: 'already-granted' }
  | { readonly kind: 'granted' }
  | { readonly kind: 'refused' };

const PERCENT = 100;

const SMALL_SHARE = 1;

const BYTES_PER_GB = 1_000_000_000;

const BYTES_PER_MB = 1_000_000;

const BYTES_PER_KB = 1_000;

function spaceFigure(bytes: number): string {
  if (bytes >= BYTES_PER_GB) return `${(bytes / BYTES_PER_GB).toFixed(1)} GB`;
  if (bytes >= BYTES_PER_MB) return `${(bytes / BYTES_PER_MB).toFixed(1)} MB`;
  if (bytes >= BYTES_PER_KB) return `${Math.round(bytes / BYTES_PER_KB)} kB`;
  return `${bytes} bytes`;
}

function quotaShare(usage: number, quota: number): string {
  if (quota <= 0) return 'no quota reported';
  const percent = (usage / quota) * PERCENT;
  if (percent === 0) return '0%';
  if (percent < SMALL_SHARE) return `${percent.toPrecision(1)}%`;
  return `${Math.round(percent)}%`;
}

function persistOutcome(before: boolean | null, after: boolean | null): PersistOutcome {
  if (before === null || after === null) return { kind: 'unsupported' };
  if (before) return { kind: 'already-granted' };
  return after ? { kind: 'granted' } : { kind: 'refused' };
}

function holdsGrant(outcome: PersistOutcome): boolean {
  return match(outcome)
    .with({ kind: 'already-granted' }, { kind: 'granted' }, () => true)
    .with({ kind: 'refused' }, { kind: 'unsupported' }, () => false)
    .exhaustive();
}

function persistOutcomeText(outcome: PersistOutcome): string {
  return match(outcome)
    .with(
      { kind: 'unsupported' },
      () =>
        'This browser has no navigator.storage.persist(), so every store here stays best-effort.',
    )
    .with(
      { kind: 'already-granted' },
      () =>
        'This origin already held the grant before the request, so persist() resolved true without changing anything.',
    )
    .with(
      { kind: 'granted' },
      () =>
        'The request moved this origin from best-effort to persistent. The browser will not evict it under storage pressure.',
    )
    .with(
      { kind: 'refused' },
      () =>
        'persist() resolved false. Chromium and Safari base the result on how this site has been used, with no prompt; Firefox shows a prompt and resolves true only when it is accepted. The origin stays best-effort, and a later request is evaluated again.',
    )
    .exhaustive();
}

export { holdsGrant, persistOutcome, persistOutcomeText, quotaShare, spaceFigure };
export type { PersistOutcome };
