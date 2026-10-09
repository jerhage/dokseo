type RenameOutcome =
  | { readonly kind: 'renamed' }
  | { readonly kind: 'nameless' }
  | { readonly kind: 'name-taken'; readonly holder: string }
  | { readonly kind: 'unchanged' };

type RecolourOutcome = { readonly kind: 'recoloured' } | { readonly kind: 'unchanged' };

type RemoveOutcome = { readonly kind: 'removed' } | { readonly kind: 'unchanged' };

const NAMELESS = 'A tag needs a name.';

function rejectionOf(outcome: RenameOutcome): string | null {
  if (outcome.kind === 'nameless') return NAMELESS;
  if (outcome.kind === 'name-taken') return `${outcome.holder} already holds that name.`;
  return null;
}

export { NAMELESS, rejectionOf };
export type { RecolourOutcome, RemoveOutcome, RenameOutcome };
