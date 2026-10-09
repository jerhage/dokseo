function createClearConfirm() {
  let confirming = $state(false);

  return {
    get confirming(): boolean {
      return confirming;
    },
    ask(): void {
      confirming = true;
    },
    dismiss(): void {
      confirming = false;
    },
  };
}

type ClearConfirmHook = ReturnType<typeof createClearConfirm>;

export { createClearConfirm };
export type { ClearConfirmHook };
