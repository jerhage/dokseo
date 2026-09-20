import type { Container } from '$lib/container';
import type { Capture } from '../domain/capture';

export type CaptureSearchStatus = 'idle' | 'loading' | 'ready' | 'failed';

export class CaptureSearchView {
  captures = $state.raw<readonly Capture[]>([]);
  status = $state<CaptureSearchStatus>('idle');

  #container: Container;
  #generation = 0;

  constructor(container: Container) {
    this.#container = container;
  }

  get count(): number {
    return this.captures.length;
  }

  async load(): Promise<void> {
    const generation = ++this.#generation;
    this.status = 'loading';

    const listed = await this.#container.recognition.listEveryCapture().catch(() => null);
    if (generation !== this.#generation) return;

    if (listed === null || !listed.ok) {
      this.captures = [];
      this.status = 'failed';
      return;
    }

    this.captures = listed.value;
    this.status = 'ready';
  }

  dispose(): void {
    this.#generation += 1;
    this.captures = [];
    this.status = 'idle';
  }
}
