import type { Container } from '$lib/container';
import type { Notify } from '$lib/shared/notice';
import type { CaptureList } from './capture-list.svelte';
import { clearScope } from './clearing';
import type { ClearScope } from './clearing';
import { refuse, thrownFailure } from './storage-failure';

class ClearAll {
  #container: Container;
  #notify: Notify;
  #list: CaptureList;
  #confirming = $state(false);

  constructor(container: Container, notify: Notify, list: CaptureList) {
    this.#container = container;
    this.#notify = notify;
    this.#list = list;
  }

  get confirming(): boolean {
    return this.#confirming;
  }

  get scope(): ClearScope {
    return clearScope(this.#list.captures);
  }

  ask(): void {
    if (this.#list.count === 0) return;
    this.#confirming = true;
  }

  dismiss(): void {
    this.#confirming = false;
  }

  async clear(): Promise<void> {
    const book = this.#list.book;
    this.#confirming = false;
    const held = this.#list.empty();
    const generation = this.#list.generation;
    if (book === null) return;

    const cleared = await this.#container.recognition.clearCaptures(book).catch(thrownFailure);
    if (cleared.ok || generation !== this.#list.generation) return;

    this.#list.restore(held);
    refuse(this.#notify, 'Your captures could not be deleted', cleared.error);
  }
}

export { ClearAll };
