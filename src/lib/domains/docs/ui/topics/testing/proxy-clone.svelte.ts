type CloneWay = 'direct' | 'snapshot';

type CloneOutcome =
  | { readonly kind: 'cloned'; readonly way: CloneWay; readonly copy: string }
  | {
      readonly kind: 'refused';
      readonly way: CloneWay;
      readonly name: string;
      readonly message: string;
    };

type ImportPlanSample = {
  readonly captures: readonly { readonly id: string; readonly text: string }[];
  readonly tags: readonly string[];
};

function sample(): ImportPlanSample {
  return { captures: [{ id: 'capture-1', text: '本を読む' }], tags: ['Grammar'] };
}

function attempt(way: CloneWay, value: unknown): CloneOutcome {
  try {
    const copy: unknown = structuredClone(value);
    return { kind: 'cloned', way, copy: JSON.stringify(copy) };
  } catch (cause) {
    return cause instanceof Error
      ? { kind: 'refused', way, name: cause.name, message: cause.message }
      : { kind: 'refused', way, name: 'Error', message: String(cause) };
  }
}

class CloneTrial {
  plan = $state<ImportPlanSample>(sample());
  outcome = $state.raw<CloneOutcome | null>(null);

  cloneDirect(): void {
    this.outcome = attempt('direct', this.plan);
  }

  cloneSnapshot(): void {
    this.outcome = attempt('snapshot', $state.snapshot(this.plan));
  }
}

export { CloneTrial, attempt };
export type { CloneOutcome, CloneWay, ImportPlanSample };
