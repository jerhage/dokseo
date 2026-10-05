type ComposingSignals = {
  readonly isComposing: boolean;
  readonly keyCode: number;
};

const IME_PROCESS_KEY_CODE = 229;

function isComposingKey(press: ComposingSignals): boolean {
  return press.isComposing || press.keyCode === IME_PROCESS_KEY_CODE;
}

export { IME_PROCESS_KEY_CODE, isComposingKey };
export type { ComposingSignals };
