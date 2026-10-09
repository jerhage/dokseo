import { match } from 'ts-pattern';
import type { BookCapturesExporting } from '$lib/shared/book-captures-export.svelte';
import type { CaptureId, TagId } from '$lib/shared/ids';
import type { Notify } from '$lib/shared/notice';
import type { PassageOrder } from '../../domain/capture/capture-order';
import type { ModelLoad } from '../../domain/model/model-load';
import { modelLoadAnnouncement } from '../engine/model-load-text';
import type { Card } from './capture-card-projection';
import type { DraftField } from './card-drafts-session.svelte';
import type { PanelCapture } from './panel-capture';
import type { ClipboardWrite } from './text-copy.svelte';

type TagCounting = {
  readonly counts: () => ReadonlyMap<TagId, number>;
  readonly ask: () => void;
};

type PanelEnvironment = {
  readonly counting: TagCounting;
  readonly write: ClipboardWrite;
  readonly notify: Notify;
  readonly exporting: BookCapturesExporting;
  readonly passages: PassageOrder;
};

function writtenIn(field: DraftField, card: Card): string {
  return match(field)
    .with('note', () => card.annotation ?? '')
    .with('text', () => card.text ?? '')
    .exhaustive();
}

function announcementOf(cards: readonly PanelCapture[], progress: ModelLoad | null): string {
  return cards.some((card) => card.status === 'pending') ? modelLoadAnnouncement(progress) : '';
}

function taggingCard(cards: readonly Card[], capture: CaptureId | null): Card | null {
  return cards.find((card) => card.id === capture) ?? null;
}

export { announcementOf, taggingCard, writtenIn };
export type { PanelEnvironment, TagCounting };
