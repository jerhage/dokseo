import { match } from 'ts-pattern';
import type { CaptureOrigin } from '$lib/shared/capture-origin';

type Counted = { readonly origin: CaptureOrigin };

type ClearScope =
  | { readonly kind: 'nothing' }
  | { readonly kind: 'readings'; readonly readings: number }
  | { readonly kind: 'notes'; readonly notes: number }
  | { readonly kind: 'both'; readonly readings: number; readonly notes: number };

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function clearScope(captures: readonly Counted[]): ClearScope {
  const notes = captures.filter((capture) => capture.origin === 'written').length;
  const readings = captures.length - notes;

  if (readings > 0 && notes > 0) return { kind: 'both', readings, notes };
  if (notes > 0) return { kind: 'notes', notes };
  if (readings > 0) return { kind: 'readings', readings };

  return { kind: 'nothing' };
}

function clearWarning(scope: ClearScope): string | null {
  return match(scope)
    .with({ kind: 'nothing' }, () => null)
    .with(
      { kind: 'readings' },
      (only) => `Delete ${plural(only.readings, 'reading', 'readings')}? You can read them again.`,
    )
    .with(
      { kind: 'notes' },
      (only) =>
        `Delete ${plural(only.notes, 'note', 'notes')}? Nothing you wrote can be recovered.`,
    )
    .with(
      { kind: 'both' },
      (all) =>
        `Delete ${plural(all.readings, 'reading', 'readings')} and ${plural(all.notes, 'note', 'notes')}? The readings can be read again. The notes cannot.`,
    )
    .exhaustive();
}

export { clearScope, clearWarning };
export type { ClearScope, Counted };
