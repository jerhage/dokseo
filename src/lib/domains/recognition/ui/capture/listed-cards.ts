import { match } from 'ts-pattern';
import type { ArrivalCapture } from '../../domain/capture/capture-arrival';
import { oldestFirst } from '../../domain/capture/capture';
import type { Capture } from '../../domain/capture/capture';
import type { RecognizedText } from '../../domain/engine/recognized-text';
import { cardOf } from './panel-capture';
import type { PanelCapture, Taken } from './panel-capture';

function listedCards(
  stored: readonly Capture[],
  unsaved: readonly PanelCapture[],
): readonly PanelCapture[] {
  const held = new Set(stored.map((capture) => capture.id));

  return [...oldestFirst(stored).map(cardOf), ...unsaved.filter((card) => !held.has(card.id))];
}

function noteKept(stored: Capture | undefined, origin: 'recognized' | 'lifted'): string | null {
  return stored?.origin === origin ? stored.note : null;
}

function markedCapture(
  card: Taken & { readonly text: RecognizedText },
  stored: Capture | undefined,
): ArrivalCapture {
  const held = { id: card.id, anchor: card.anchor, text: card.text.text };

  return match(card)
    .with({ origin: 'written' }, () => ({ ...held, origin: 'written' as const }))
    .with({ origin: 'lifted' }, () => ({
      ...held,
      origin: 'lifted' as const,
      note: noteKept(stored, 'lifted'),
    }))
    .with({ origin: 'recognized' }, () => ({
      ...held,
      origin: 'recognized' as const,
      note: noteKept(stored, 'recognized'),
    }))
    .exhaustive();
}

function readCaptures(
  cards: readonly PanelCapture[],
  stored: readonly Capture[],
): readonly ArrivalCapture[] {
  const byId = new Map(stored.map((capture) => [capture.id, capture]));

  return cards
    .filter((card) => card.status === 'done')
    .map((card) => markedCapture(card, byId.get(card.id)));
}

export { listedCards, markedCapture, readCaptures };
