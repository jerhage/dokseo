import { match } from 'ts-pattern';

type TagRemoval =
  | { readonly kind: 'unused'; readonly name: string }
  | { readonly kind: 'single'; readonly name: string }
  | { readonly kind: 'several'; readonly name: string; readonly captures: number };

function tagRemoval(name: string, captures: number): TagRemoval {
  if (captures <= 0) return { kind: 'unused', name };
  if (captures === 1) return { kind: 'single', name };

  return { kind: 'several', name, captures };
}

function removalWarning(removal: TagRemoval): string {
  return match(removal)
    .with(
      { kind: 'unused' },
      (none) => `Delete ${none.name}? Nothing carries it, so no capture changes.`,
    )
    .with(
      { kind: 'single' },
      (one) => `Delete ${one.name}? One capture loses the tag. The capture itself is kept.`,
    )
    .with(
      { kind: 'several' },
      (many) =>
        `Delete ${many.name}? ${many.captures} captures lose the tag. The captures themselves are kept.`,
    )
    .exhaustive();
}

export { tagRemoval, removalWarning };
export type { TagRemoval };
