import { refusingRules, sourcePath } from '$lib/domains/docs/domain/import-rules';
import type { ImportKind } from '$lib/domains/docs/domain/import-rules';

type CheckPreset = {
  readonly label: string;
  readonly from: string;
  readonly to: string;
  readonly kind: ImportKind;
};

type CheckVerdict =
  | { readonly kind: 'incomplete' }
  | { readonly kind: 'allowed'; readonly from: string; readonly to: string }
  | {
      readonly kind: 'forbidden';
      readonly from: string;
      readonly to: string;
      readonly rules: readonly string[];
    };

const CHECK_PRESETS: readonly CheckPreset[] = [
  {
    label: 'A route takes an adapter',
    from: 'src/routes/+page.svelte',
    to: '$lib/domains/library/adapters/indexeddb-opfs-library.repo.ts',
    kind: 'value',
  },
  {
    label: 'A leaf reads another leaf',
    from: '$lib/domains/library/domain/book/book.ts',
    to: '$lib/domains/recognition/domain/capture/capture.ts',
    kind: 'type-only',
  },
  {
    label: 'storage composes a leaf',
    from: '$lib/domains/storage/use-cases/remove-book-and-captures.ts',
    to: '$lib/domains/library/use-cases/remove-book.ts',
    kind: 'value',
  },
  {
    label: 'docs renders storage UI',
    from: '$lib/domains/docs/ui/topics/StoragePage.svelte',
    to: '$lib/domains/storage/ui/StorageData.svelte',
    kind: 'value',
  },
  {
    label: 'A query calls a use case',
    from: '$lib/domains/storage/queries/storage-queries.ts',
    to: '$lib/domains/storage/use-cases/read-storage-account.ts',
    kind: 'value',
  },
  {
    label: 'A route takes a barrel',
    from: 'src/routes/+page.svelte',
    to: '$lib/domains/library/ui/index.ts',
    kind: 'value',
  },
  {
    label: 'The barrel takes a use case',
    from: '$lib/domains/library/ui/index.ts',
    to: '$lib/domains/library/use-cases/open-file.ts',
    kind: 'value',
  },
  {
    label: 'A base component reads shared',
    from: '$lib/components/Button.svelte',
    to: '$lib/shared/ids.ts',
    kind: 'type-only',
  },
];

function checkVerdict(rawFrom: string, rawTo: string, kind: ImportKind): CheckVerdict {
  const from = sourcePath(rawFrom);
  const to = sourcePath(rawTo);
  if (from === '' || to === '') return { kind: 'incomplete' };
  const rules = refusingRules(from, to, kind);
  if (rules.length === 0) return { kind: 'allowed', from, to };
  return { kind: 'forbidden', from, to, rules };
}

class ImportCheck {
  from = $state('');
  to = $state('');
  kind = $state<ImportKind>('value');

  readonly verdict = $derived(checkVerdict(this.from, this.to, this.kind));

  constructor(preset: CheckPreset | undefined = CHECK_PRESETS[0]) {
    if (preset !== undefined) this.use(preset);
  }

  use(preset: CheckPreset): void {
    this.from = preset.from;
    this.to = preset.to;
    this.kind = preset.kind;
  }

  swap(): void {
    const from = this.from;
    this.from = this.to;
    this.to = from;
  }
}

export { CHECK_PRESETS, ImportCheck, checkVerdict };
export type { CheckPreset, CheckVerdict };
