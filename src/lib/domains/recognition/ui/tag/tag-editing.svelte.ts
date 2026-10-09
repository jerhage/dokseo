import type { TagId } from '$lib/shared/ids';
import type { Tag } from '../../domain/tag/tag';

function createTagEditing() {
  let renaming = $state.raw<TagId | null>(null);
  let draft = $state('');
  let confirming = $state.raw<TagId | null>(null);
  let invalid = $state.raw<string | null>(null);

  return {
    get renaming(): TagId | null {
      return renaming;
    },
    get draft(): string {
      return draft;
    },
    get confirming(): TagId | null {
      return confirming;
    },
    get invalid(): string | null {
      return invalid;
    },
    startRename(tag: Tag): void {
      renaming = tag.id;
      draft = tag.name;
      confirming = null;
      invalid = null;
    },
    abandonRename(): void {
      renaming = null;
      draft = '';
      invalid = null;
    },
    setDraft(text: string): void {
      draft = text;
    },
    askRemove(tag: Tag): void {
      confirming = tag.id;
      renaming = null;
      draft = '';
      invalid = null;
    },
    dismissRemove(): void {
      confirming = null;
    },
    renamed(): void {
      renaming = null;
      draft = '';
      invalid = null;
    },
    rejected(message: string): void {
      invalid = message;
    },
    recoloured(): void {
      invalid = null;
    },
    removed(): void {
      confirming = null;
      invalid = null;
    },
  };
}

type TagEditingHook = ReturnType<typeof createTagEditing>;

export { createTagEditing };
export type { TagEditingHook };
