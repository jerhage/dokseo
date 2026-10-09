import type { CatalogId } from '$lib/shared/ids';
import type { FormField } from './catalog-texts';

type FormTarget = { readonly kind: 'add' } | { readonly kind: 'edit'; readonly id: CatalogId };

type RemovalTarget = { readonly id: CatalogId; readonly name: string };

type ShownRefusal = { readonly field: FormField; readonly text: string };

type CatalogDialog =
  | { readonly kind: 'closed' }
  | {
      readonly kind: 'editing';
      readonly target: FormTarget;
      readonly refusal: ShownRefusal | null;
    }
  | { readonly kind: 'removing'; readonly removal: RemovalTarget };

const CLOSED: CatalogDialog = { kind: 'closed' };

function createCatalogDialog() {
  let dialog = $state.raw<CatalogDialog>(CLOSED);

  return {
    get dialog(): CatalogDialog {
      return dialog;
    },
    edit(target: FormTarget): void {
      dialog = { kind: 'editing', target, refusal: null };
    },
    refuse(refusal: ShownRefusal | null): void {
      if (dialog.kind === 'editing') dialog = { ...dialog, refusal };
    },
    remove(removal: RemovalTarget): void {
      dialog = { kind: 'removing', removal };
    },
    close(): void {
      dialog = CLOSED;
    },
  };
}

export { createCatalogDialog };
export type { CatalogDialog, FormTarget, RemovalTarget, ShownRefusal };
