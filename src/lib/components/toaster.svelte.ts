import { toastDuration } from './toast-duration';
import type { RequestedDuration, ToastDuration } from './toast-duration';
import type { StatusVariant } from './classes';

type ToastId = number;

type ToastPhase = 'shown' | 'leaving';

type ToastOptions = {
  readonly title: string;
  readonly message?: string;
  readonly variant?: StatusVariant;
  readonly duration?: RequestedDuration;
};

type Toast = {
  readonly id: ToastId;
  readonly title: string;
  readonly message: string | undefined;
  readonly variant: StatusVariant;
  readonly duration: ToastDuration;
  readonly phase: ToastPhase;
};

class Toaster {
  #toasts = $state<readonly Toast[]>([]);
  #next: ToastId = 1;

  get toasts(): readonly Toast[] {
    return this.#toasts;
  }

  show(options: ToastOptions): ToastId {
    const id = this.#next;
    this.#next += 1;
    const toast: Toast = {
      id,
      title: options.title,
      message: options.message,
      variant: options.variant ?? 'info',
      duration: toastDuration(options.duration),
      phase: 'shown',
    };
    this.#toasts = [...this.#toasts, toast];
    return id;
  }

  dismiss(id: ToastId): void {
    this.#toasts = this.#toasts.map((toast) =>
      toast.id === id && toast.phase === 'shown' ? { ...toast, phase: 'leaving' } : toast,
    );
  }

  remove(id: ToastId): void {
    this.#toasts = this.#toasts.filter((toast) => toast.id !== id);
  }
}

function createToaster(): Toaster {
  return new Toaster();
}

export { Toaster, createToaster };
export type { Toast, ToastId, ToastOptions, ToastPhase };
