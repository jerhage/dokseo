import type { Anchor } from '$lib/shared/anchor';
import type { CaptureId } from '$lib/shared/ids';
import type { Capture } from '../../domain/capture/capture';
import type { ArrivalCapture } from '../../domain/capture/capture-arrival';
import { UNLISTED } from './capture-read';
import type { CaptureListing } from './capture-read';
import { listedCards, readCaptures } from './listed-cards';
import type { PanelCapture } from './panel-capture';

type CaptureLookup = {
  readonly cards: readonly PanelCapture[];
  readonly stored: (id: CaptureId) => Capture | undefined;
};

function listingOf(read: CaptureListing | undefined): CaptureListing {
  return read ?? UNLISTED;
}

function panelCapturesOf(
  listing: CaptureListing,
  unsaved: readonly PanelCapture[],
): readonly PanelCapture[] {
  return listedCards(listing.captures, unsaved);
}

function newestFirstOf(cards: readonly PanelCapture[]): readonly PanelCapture[] {
  return cards.toReversed();
}

function anchorsOf(cards: readonly PanelCapture[]): readonly Anchor[] {
  return cards.map((card) => card.anchor);
}

function readOf(
  cards: readonly PanelCapture[],
  listing: CaptureListing,
): readonly ArrivalCapture[] {
  return readCaptures(cards, listing.captures);
}

function storedIn(listing: CaptureListing, id: CaptureId): Capture | undefined {
  return listing.captures.find((capture) => capture.id === id);
}

export { anchorsOf, listingOf, newestFirstOf, panelCapturesOf, readOf, storedIn };
export type { CaptureLookup };
