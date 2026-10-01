type FrameClock = {
  readonly request: (step: (now: number) => void) => number;
  readonly cancel: (frame: number) => void;
};

const ANIMATION_FRAMES: FrameClock = {
  request: (step) => requestAnimationFrame(step),
  cancel: (frame) => cancelAnimationFrame(frame),
};

export { ANIMATION_FRAMES };
export type { FrameClock };
