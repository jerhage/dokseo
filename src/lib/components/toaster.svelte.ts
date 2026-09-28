import { untrack } from 'svelte';
import { toastDuration } from './toast-duration';
import type { RequestedDuration, ToastDuration } from './toast-duration';
import type { StatusVariant, ToastPlacement } from './classes';

type ToastId = number;

type RegionId = number;

type ToastPhase = 'shown' | 'leaving';

type ToastAction = {
  readonly label: string;
  readonly run: () => void;
};

type ToastOptions = {
  readonly title: string;
  readonly message?: string;
  readonly variant?: StatusVariant;
  readonly duration?: RequestedDuration;
  readonly action?: ToastAction;
  readonly placement?: ToastPlacement;
};

type Toast = {
  readonly id: ToastId;
  readonly title: string;
  readonly message: string | undefined;
  readonly variant: StatusVariant;
  readonly duration: ToastDuration;
  readonly action: ToastAction | undefined;
  readonly placement: ToastPlacement;
  readonly phase: ToastPhase;
};

type AttachedRegion = {
  readonly id: RegionId;
  readonly placement: ToastPlacement;
};

type Clearance = {
  readonly id: number;
  readonly blockEnd: number;
};

class Toaster {
  #toasts = $state<readonly Toast[]>([]);
  #regions = $state<readonly AttachedRegion[]>([]);
  #clearances = $state<readonly Clearance[]>([]);
  #next: ToastId = 1;
  #nextRegion: RegionId = 1;
  #nextClearance = 1;

  get toasts(): readonly Toast[] {
    return this.#toasts;
  }

  get activeRegion(): RegionId | undefined {
    return this.#regions.at(-1)?.id;
  }

  get clearance(): number {
    return Math.max(0, ...this.#clearances.map((clearance) => clearance.blockEnd));
  }

  show(options: ToastOptions): ToastId {
    const id = this.#next;
    this.#next += 1;
    const toast: Toast = {
      id,
      title: options.title,
      message: options.message,
      variant: options.variant ?? 'info',
      duration: toastDuration(options.duration, options.action !== undefined),
      action: options.action,
      placement: options.placement ?? 'bottom',
      phase: 'shown',
    };
    this.#toasts = untrack(() => [...this.#toasts, toast]);
    return id;
  }

  act(id: ToastId): void {
    const toast = untrack(() =>
      this.#toasts.find((shown) => shown.id === id && shown.phase === 'shown'),
    );
    if (toast?.action === undefined) return;
    try {
      toast.action.run();
    } finally {
      this.dismiss(id);
    }
  }

  dismiss(id: ToastId): void {
    this.#toasts = untrack(() =>
      this.#toasts.map((toast) =>
        toast.id === id && toast.phase === 'shown' ? { ...toast, phase: 'leaving' } : toast,
      ),
    );
  }

  remove(id: ToastId): void {
    this.#toasts = untrack(() => this.#toasts.filter((toast) => toast.id !== id));
  }

  regionFor(placement: ToastPlacement): RegionId | undefined {
    const placed = this.#regions.findLast((region) => region.placement === placement);
    return (placed ?? this.#regions.at(-1))?.id;
  }

  toastsIn(region: RegionId): readonly Toast[] {
    return this.#toasts.filter((toast) => this.regionFor(toast.placement) === region);
  }

  attachRegion(placement: ToastPlacement = 'bottom'): RegionId {
    const id = this.#nextRegion;
    this.#nextRegion += 1;
    this.#regions = untrack(() => [...this.#regions, { id, placement }]);
    return id;
  }

  detachRegion(id: RegionId): void {
    this.#regions = untrack(() => this.#regions.filter((region) => region.id !== id));
  }

  reserveBlockEnd(blockEnd: number): () => void {
    const id = this.#nextClearance;
    this.#nextClearance += 1;
    this.#clearances = untrack(() => [...this.#clearances, { id, blockEnd }]);
    return () => {
      this.#clearances = untrack(() => this.#clearances.filter((clearance) => clearance.id !== id));
    };
  }
}

function createToaster(): Toaster {
  return new Toaster();
}

export { Toaster, createToaster };
export type { RegionId, Toast, ToastAction, ToastId, ToastOptions, ToastPhase };
