export type IdleChrome = {
  readonly awake: () => boolean;
  readonly stir: () => void;
  readonly stop: () => void;
};

export type IdleChromeOptions = {
  readonly delay: number;
  readonly held: () => boolean;
  readonly changed: (awake: boolean) => void;
};

export function idleChrome({ delay, held, changed }: IdleChromeOptions): IdleChrome {
  let awake = true;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function disarm(): void {
    if (timer === null) return;

    clearTimeout(timer);
    timer = null;
  }

  function arm(): void {
    disarm();
    timer = setTimeout(settle, delay);
  }

  function settle(): void {
    timer = null;

    if (held()) {
      arm();
      return;
    }

    if (!awake) return;

    awake = false;
    changed(false);
  }

  function stir(): void {
    if (!awake) {
      awake = true;
      changed(true);
    }

    arm();
  }

  arm();

  return {
    awake: () => awake,
    stir,
    stop: disarm,
  };
}
