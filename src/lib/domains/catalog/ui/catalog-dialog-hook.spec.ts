import { describe, expect, it } from 'vitest';
import { catalogId } from '$lib/shared/ids';
import { createCatalogDialog } from './catalog-dialog.svelte';

const HOME = catalogId('home');

describe('createCatalogDialog', () => {
  it('starts closed', () => {
    expect(createCatalogDialog().dialog).toEqual({ kind: 'closed' });
  });

  it('opens the form for a target without a refusal', () => {
    const dialog = createCatalogDialog();

    dialog.edit({ kind: 'edit', id: HOME });

    expect(dialog.dialog).toEqual({
      kind: 'editing',
      target: { kind: 'edit', id: HOME },
      refusal: null,
    });
  });

  it('shows a refusal on the open form and clears it', () => {
    const dialog = createCatalogDialog();
    dialog.edit({ kind: 'add' });

    dialog.refuse({ field: 'title', text: 'A catalog needs a name.' });
    expect(dialog.dialog).toMatchObject({ refusal: { field: 'title' } });
    dialog.refuse(null);

    expect(dialog.dialog).toMatchObject({ refusal: null });
  });

  it('shows no refusal when no form is open', () => {
    const dialog = createCatalogDialog();

    dialog.refuse({ field: 'url', text: 'x' });
    expect(dialog.dialog).toEqual({ kind: 'closed' });

    dialog.remove({ id: HOME, name: 'Home' });
    dialog.refuse({ field: 'url', text: 'x' });
    expect(dialog.dialog).toEqual({ kind: 'removing', removal: { id: HOME, name: 'Home' } });
  });

  it('holds the removal in place of the form and closes', () => {
    const dialog = createCatalogDialog();
    dialog.edit({ kind: 'add' });

    dialog.remove({ id: HOME, name: 'Home' });
    expect(dialog.dialog.kind).toBe('removing');
    dialog.close();

    expect(dialog.dialog).toEqual({ kind: 'closed' });
  });
});
