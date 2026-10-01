import type { ToastId, Toaster } from '$lib/components/toaster.svelte';
import { describeCause } from './cause';

type FailureSite = 'navigation' | 'render' | 'query' | 'write' | 'window' | 'promise';

type FailureToaster = Pick<Toaster, 'show' | 'toasts'>;

const UNEXPECTED_FAILURE_TITLE = 'Something went wrong';

function logUnexpected(site: FailureSite, error: unknown): void {
  console.error(`Unexpected failure (${site})`, error);
}

function unexpectedMessage(error: unknown): string {
  return `${UNEXPECTED_FAILURE_TITLE}: ${describeCause(error)}`;
}

function windowErrorCause(event: Event): unknown {
  return 'error' in event ? event.error : event;
}

class UnexpectedFailures {
  #toaster: FailureToaster;
  #shown: ToastId | null = null;

  constructor(toaster: FailureToaster) {
    this.#toaster = toaster;
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
  UNEXPECTED_FAILURE_TITLE,
  UnexpectedFailures,
  logUnexpected,
  unexpectedMessage,
  windowErrorCause,
};
export type { FailureSite, FailureToaster };
