import type { Catalog } from '../domain/catalog';

type PasswordChoice =
  | { readonly kind: 'unlock'; readonly remember: boolean }
  | { readonly kind: 'forget' }
  | { readonly kind: 'keep' };

type PasswordChoiceInput = {
  readonly authKind: Catalog['auth']['kind'];
  readonly typed: boolean;
  readonly remember: boolean;
  readonly wasRemembered: boolean;
};

function passwordChoiceOf(input: PasswordChoiceInput): PasswordChoice {
  const { authKind, typed, remember, wasRemembered } = input;
  if (authKind === 'none') return wasRemembered ? { kind: 'forget' } : { kind: 'keep' };
  if (typed) return { kind: 'unlock', remember };
  if (!remember && wasRemembered) return { kind: 'forget' };
  return { kind: 'keep' };
}

export { passwordChoiceOf };
export type { PasswordChoice, PasswordChoiceInput };
