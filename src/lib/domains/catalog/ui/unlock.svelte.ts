type UnlockPrompt = { readonly kind: 'asking' } | { readonly kind: 'dismissed' };

function createUnlock() {
  let prompt = $state.raw<UnlockPrompt>({ kind: 'asking' });

  return {
    get prompt(): UnlockPrompt {
      return prompt;
    },
    ask(): void {
      prompt = { kind: 'asking' };
    },
    dismiss(): void {
      prompt = { kind: 'dismissed' };
    },
  };
}

export { createUnlock };
export type { UnlockPrompt };
