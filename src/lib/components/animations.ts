type Settling = {
  readonly finished: Promise<unknown>;
  readonly effect: { getComputedTiming(): { iterations?: number | null } } | null;
};

type Animated = {
  getAnimations(): readonly Settling[];
};

function ends(animation: Settling): boolean {
  return animation.effect?.getComputedTiming().iterations !== Infinity;
}

async function animationsSettled(elements: readonly Animated[]): Promise<void> {
  const running = elements.flatMap((element) => element.getAnimations()).filter(ends);
  await Promise.allSettled(running.map((animation) => animation.finished));
}

export { animationsSettled };
export type { Animated, Settling };
