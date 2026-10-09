type MousePress = {
  readonly button: number;
  readonly isPrimary: boolean;
};

type GrabPress =
  | { readonly kind: 'grab'; readonly bySpace: boolean }
  | { readonly kind: 'select' }
  | { readonly kind: 'ignore' };

const MIDDLE_BUTTON = 1;

const MAIN_BUTTON = 0;

function grabPress(press: MousePress, spaceHeld: boolean): GrabPress {
  if (press.button === MIDDLE_BUTTON) return { kind: 'grab', bySpace: false };
  if (!press.isPrimary || press.button !== MAIN_BUTTON) return { kind: 'ignore' };
  if (spaceHeld) return { kind: 'grab', bySpace: true };
  return { kind: 'select' };
}

export { grabPress };
export type { GrabPress, MousePress };
