import type { CaptureId } from '$lib/shared/ids';
import type { CaptureConflict } from '../use-cases/captures-import-plan';
import { NO_CHOICES, draftFor, withChoice } from './captures-import-rules';
import type {
  ConflictChoices,
  ConflictDraft,
  ConflictSide,
  ConflictStrategy,
} from './captures-import-rules';

function createConflictReview() {
  let strategy = $state<ConflictStrategy>('newer');
  let choices = $state.raw<ConflictChoices>(NO_CHOICES);
  let draft = $state.raw<ConflictDraft | null>(null);

  return {
    get strategy(): ConflictStrategy {
      return strategy;
    },
    get choices(): ConflictChoices {
      return choices;
    },
    get draft(): ConflictDraft | null {
      return draft;
    },
    reset(): void {
      strategy = 'newer';
      choices = NO_CHOICES;
      draft = null;
    },
    pickStrategy(next: ConflictStrategy): void {
      strategy = next;
      draft = null;
    },
    pick(id: CaptureId, side: ConflictSide): void {
      if (strategy !== 'review') return;
      choices = withChoice(choices, id, { kind: side });
    },
    edit(conflict: CaptureConflict): void {
      if (strategy !== 'review') return;
      draft = draftFor(conflict, choices.get(conflict.id));
    },
    draftText(text: string): void {
      if (strategy !== 'review' || draft === null) return;
      draft = { ...draft, text };
    },
    draftNote(note: string): void {
      if (strategy !== 'review' || draft === null) return;
      draft = { ...draft, note };
    },
    saveDraft(): void {
      if (strategy !== 'review' || draft === null) return;
      const { id, text, note } = draft;
      choices = withChoice(choices, id, { kind: 'edit', text, note });
      draft = null;
    },
    cancelDraft(): void {
      if (strategy !== 'review') return;
      draft = null;
    },
  };
}

type ConflictReviewHook = ReturnType<typeof createConflictReview>;

export { createConflictReview };
export type { ConflictReviewHook };
