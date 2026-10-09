function createRemovalConfirm() {
  let confirming = $state(false);

  return {
    get confirming(): boolean {
      return confirming;
    },
    ask(stored: boolean): void {
      if (!stored) return;
      confirming = true;
    },
    dismiss(): void {
      confirming = false;
    },
  };
}

type RemovalConfirmHook = ReturnType<typeof createRemovalConfirm>;

export { createRemovalConfirm };
export type { RemovalConfirmHook };
