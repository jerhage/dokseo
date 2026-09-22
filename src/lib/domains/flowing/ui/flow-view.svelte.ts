import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import type { BookId } from '$lib/shared/ids';
import type { FlowSurface } from './flow-surface';

type SourceOutcome = Awaited<ReturnType<Container['library']['readSource']>>;

type SourceFailure = Extract<SourceOutcome, { readonly ok: false }>['error'];

type ShowFlowBook = (source: Blob) => Promise<FlowSurface>;

type FlowState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'opening' }
  | { readonly kind: 'ready' }
  | { readonly kind: 'failed'; readonly message: string };

type FlowCurtain =
  | { readonly kind: 'none' }
  | { readonly kind: 'opening' }
  | { readonly kind: 'notice'; readonly message: string };

const NOT_OPENED: FlowState = { kind: 'idle' };

const OPENING: FlowState = { kind: 'opening' };

const SHOWING_THE_BOOK: FlowState = { kind: 'ready' };

const NOTHING_OVER_THE_BOOK: FlowCurtain = { kind: 'none' };

const WAITING_FOR_THE_BOOK: FlowCurtain = { kind: 'opening' };

function describeSourceFailure(error: SourceFailure): string {
  return match(error)
    .with({ kind: 'not-found' }, () => 'That book is no longer stored on this device.')
    .with(
      { kind: 'storage-unavailable' },
      () => 'This browser blocks local storage, so that book cannot be read.',
    )
    .with({ kind: 'storage-failed' }, (failed) => `Local storage failed: ${failed.cause}`)
    .exhaustive();
}

function curtainFor(state: FlowState): FlowCurtain {
  return match(state)
    .with({ kind: 'idle' }, () => NOTHING_OVER_THE_BOOK)
    .with({ kind: 'opening' }, () => WAITING_FOR_THE_BOOK)
    .with({ kind: 'ready' }, () => NOTHING_OVER_THE_BOOK)
    .with({ kind: 'failed' }, (stopped) => ({ kind: 'notice' as const, message: stopped.message }))
    .exhaustive();
}

class FlowView {
  state = $state.raw<FlowState>(NOT_OPENED);

  #container: Container;
  #generation = 0;
  #surface: FlowSurface | null = null;

  constructor(container: Container) {
    this.#container = container;
  }

  get curtain(): FlowCurtain {
    return curtainFor(this.state);
  }

  async open(id: BookId, show: ShowFlowBook): Promise<void> {
    const generation = ++this.#generation;
    this.#release();
    this.state = OPENING;

    let stored: SourceOutcome;
    try {
      stored = await this.#container.library.readSource(id);
    } catch (cause) {
      if (generation !== this.#generation) return;
      this.state = { kind: 'failed', message: `That book could not be read: ${String(cause)}` };
      return;
    }

    if (generation !== this.#generation) return;

    if (!stored.ok) {
      this.state = { kind: 'failed', message: describeSourceFailure(stored.error) };
      return;
    }

    let surface: FlowSurface;
    try {
      surface = await show(stored.value);
    } catch (cause) {
      if (generation !== this.#generation) return;
      this.state = {
        kind: 'failed',
        message: `This book could not be displayed: ${String(cause)}`,
      };
      return;
    }

    if (generation !== this.#generation) {
      surface.destroy();
      return;
    }

    this.#surface = surface;
    this.state = SHOWING_THE_BOOK;
  }

  close(): void {
    this.#generation += 1;
    this.#release();
    this.state = NOT_OPENED;
  }

  #release(): void {
    this.#surface?.destroy();
    this.#surface = null;
  }
}

export { FlowView };
export type { FlowCurtain, FlowState, ShowFlowBook };
