type Clock = {
  readonly now: () => number;
  readonly schedule: (run: () => void, ms: number) => () => void;
};

const SYSTEM_CLOCK: Clock = {
  now: () => performance.now(),
  schedule: (run, ms) => {
    const handle = setTimeout(run, ms);
    return () => clearTimeout(handle);
  },
};

export { SYSTEM_CLOCK };
export type { Clock };
