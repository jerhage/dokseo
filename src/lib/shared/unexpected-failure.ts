import type { ToastId, Toaster } from '$lib/components/toaster.svelte';
import { describeCause } from './cause';

type FailureSite =
  | 'navigation'
  | 'render'
  | 'query'
  | 'write'
  | 'window'
  | 'promise'
  | 'service-worker';

type FailureToaster = Pick<Toaster, 'show' | 'toasts'>;

const UNEXPECTED_FAILURE_TITLE = 'Something went wrong';

const RESIZE_OBSERVER_NOTICE = 'ResizeObserver loop completed with undelivered notifications.';

function logUnexpected(site: FailureSite, error: unknown): void {
  console.error(`Unexpected failure (${site})`, error);
}

function unexpectedMessage(error: unknown): string {
  return `${UNEXPECTED_FAILURE_TITLE}: ${describeCause(error)}`;
}

function windowErrorCause(event: Event): unknown {
  return 'error' in event ? event.error : event;
}

function isResizeObserverNotice(event: Event): boolean {
  if (!('message' in event) || event.message !== RESIZE_OBSERVER_NOTICE) return false;

  const cause = windowErrorCause(event);
  return cause === null || cause === undefined;
}

class UnexpectedFailures {
  #toaster: FailureToaster;
  #shown: ToastId | null = null;

  constructor(toaster: FailureToaster) {
    this.#toaster = toaster;
  }

  windowError(event: Event): void {
    if (isResizeObserverNotice(event)) return;

    this.raise('window', windowErrorCause(event));
  }

  raise(site: FailureSite, error: unknown): void {
    logUnexpected(site, error);
    const shown = this.#shown;
    if (
      shown !== null &&
      this.#toaster.toasts.some((toast) => toast.id === shown && toast.phase === 'shown')
    )
      return;

    this.#shown = this.#toaster.show({
      variant: 'danger',
      title: UNEXPECTED_FAILURE_TITLE,
      message: describeCause(error),
    });
  }
}

export {
  RESIZE_OBSERVER_NOTICE,
  UNEXPECTED_FAILURE_TITLE,
  UnexpectedFailures,
  isResizeObserverNotice,
  logUnexpected,
  unexpectedMessage,
  windowErrorCause,
};
export type { FailureSite, FailureToaster };
