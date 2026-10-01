import type { CaptureId } from '$lib/shared/ids';
import { takenOf } from './panel-capture';
import type { PanelCapture, Settled } from './panel-capture';

class UnsavedCards {
  #cards = $state.raw<readonly PanelCapture[]>([]);
  #latest = $state.raw<CaptureId | null>(null);

  get cards(): readonly PanelCapture[] {
    return this.#cards;
  }

  get latest(): CaptureId | null {
    return this.#latest;
  }

  holds(id: CaptureId): boolean {
    return this.#cards.some((card) => card.id === id);
  }

  put(card: PanelCapture): void {
    this.#cards = [...this.#cards, card];
    this.#latest = card.id;
  }

  settle(id: CaptureId, settled: Settled): void {
    this.#cards = this.#cards.map((card) =>
      card.id === id ? { ...takenOf(card), ...settled } : card,
    );
  }

  drop(id: CaptureId): void {
    this.#cards = this.#cards.filter((card) => card.id !== id);
  }

  empty(): readonly PanelCapture[] {
    const held = this.#cards;
    this.#cards = [];
    return held;
  }

  restore(held: readonly PanelCapture[]): void {
    const kept = new Set(this.#cards.map((card) => card.id));
    this.#cards = [...held.filter((card) => !kept.has(card.id)), ...this.#cards];
  }

  forget(): void {
    this.#cards = [];
    this.#latest = null;
  }
}

export { UnsavedCards };
