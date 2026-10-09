import { useQueryClient } from '@tanstack/svelte-query';
import { match } from 'ts-pattern';
import type { CatalogId } from '$lib/shared/ids';
import type { Notify } from '$lib/shared/notice';
import { writeQuery } from '$lib/shared/write-query.svelte';
import type { WriteQuery } from '$lib/shared/write-query.svelte';
import type { Catalog } from '../domain/catalog';
import { DEFAULT_CATALOG_PROTOCOL } from '../domain/catalog-protocol';
import type { CatalogDraft, DraftRefusal } from '../domain/catalog-draft';
import { catalogKeys } from '../queries/catalog-keys';
import {
  addCatalogMutation,
  editCatalogMutation,
  removeCatalogMutation,
  testConnectionMutation,
} from '../queries/catalog-queries';
import type { CatalogEdit, CatalogWrites, ConnectionRequest } from '../queries/catalog-queries';
import type { AddCatalogResult } from '../use-cases/add-catalog';
import type { EditCatalogResult } from '../use-cases/edit-catalog';
import type { RemoveCatalogResult } from '../use-cases/remove-catalog';
import type { TestCatalogConnectionResult } from '../use-cases/test-catalog-connection';
import type { UnlockCatalogResult } from '../use-cases/unlock-catalog';
import type { CatalogDialog, FormTarget, createCatalogDialog } from './catalog-dialog.svelte';
import { connectionOutcome, fieldRefusal } from './catalog-texts';
import type { ConnectionOutcome, FormField } from './catalog-texts';

type CatalogSettingsUseCases = CatalogWrites & {
  readonly unlockCatalog: (id: CatalogId, password: string) => UnlockCatalogResult;
};

type AuthChoice = 'none' | 'basic';

type ConnectionTest =
  | { readonly kind: 'idle' }
  | { readonly kind: 'testing' }
  | { readonly kind: 'done'; readonly outcome: ConnectionOutcome };

type SavedResult = AddCatalogResult | EditCatalogResult;

const IDLE: ConnectionTest = { kind: 'idle' };

const UNREADABLE_NAME = 'this unreadable catalog';

const SAVE_FAILED = 'Could not save that catalog';

const REMOVE_FAILED = 'Could not remove that catalog';

const STORAGE_BLOCKED = 'This browser blocks local storage, so catalogs cannot be kept.';

const GONE = 'That catalog no longer exists.';

const UNREADABLE = 'That catalog could not be read, so it cannot be changed. Remove it instead.';

class CatalogSettingsView {
  title = $state('');
  rootUrl = $state('');
  authChoice = $state<AuthChoice>('none');
  username = $state('');
  password = $state('');
  connection = $state.raw<ConnectionTest>(IDLE);
  saving = $state(false);
  removeBusy = $state(false);

  #cases: CatalogSettingsUseCases;
  #dialog: ReturnType<typeof createCatalogDialog>;
  #notify: Notify;
  #generation = 0;
  #adding: WriteQuery<AddCatalogResult, CatalogDraft>;
  #editing: WriteQuery<EditCatalogResult, CatalogEdit>;
  #removal: WriteQuery<RemoveCatalogResult, CatalogId>;
  #testing: WriteQuery<TestCatalogConnectionResult, ConnectionRequest>;

  constructor(
    cases: CatalogSettingsUseCases,
    notify: Notify,
    dialog: ReturnType<typeof createCatalogDialog>,
  ) {
    const client = useQueryClient();
    this.#cases = cases;
    this.#dialog = dialog;
    this.#notify = notify;
    this.#adding = writeQuery(() => ({
      ...addCatalogMutation(cases),
      onSettled: () => client.invalidateQueries({ queryKey: catalogKeys.catalogs() }),
    }));
    this.#editing = writeQuery(() => ({
      ...editCatalogMutation(cases),
      onSettled: (_result, _error, { id }) =>
        Promise.all([
          client.invalidateQueries({ queryKey: catalogKeys.catalogs() }),
          client.invalidateQueries({ queryKey: catalogKeys.feeds(id) }),
        ]),
    }));
    this.#removal = writeQuery(() => ({
      ...removeCatalogMutation(cases),
      onSettled: (_result, _error, id) => {
        client.removeQueries({ queryKey: catalogKeys.feeds(id) });
        client.removeQueries({ queryKey: catalogKeys.covers(id) });
        return Promise.all([
          client.invalidateQueries({ queryKey: catalogKeys.catalogs() }),
          client.invalidateQueries({ queryKey: catalogKeys.origins() }),
        ]);
      },
    }));
    this.#testing = writeQuery(() => testConnectionMutation(cases));
  }

  get titleError(): string | undefined {
    return this.#errorAt('title');
  }

  get urlError(): string | undefined {
    return this.#errorAt('url');
  }

  get usernameError(): string | undefined {
    return this.#errorAt('username');
  }

  get dialog(): CatalogDialog {
    return this.#dialog.dialog;
  }

  startAdd(): void {
    this.#open({ kind: 'add' }, '', '', 'none', '');
  }

  startEdit(catalog: Catalog): void {
    const username = catalog.auth.kind === 'basic' ? catalog.auth.username : '';
    this.#open(
      { kind: 'edit', id: catalog.id },
      catalog.title,
      catalog.rootUrl,
      catalog.auth.kind,
      username,
    );
  }

  closeForm(): void {
    this.#generation++;
    this.#dialog.close();
    this.password = '';
    this.connection = IDLE;
  }

  chooseAuth(choice: AuthChoice): void {
    this.authChoice = choice;
    this.connection = IDLE;
  }

  async test(): Promise<void> {
    if (this.connection.kind === 'testing' || this.saving) return;

    const generation = ++this.#generation;
    this.#dialog.refuse(null);
    this.connection = { kind: 'testing' };
    const draft = this.#draft();
    const result = await this.#testing.run({
      draft,
      password: this.#typedPassword(),
    });
    if (generation !== this.#generation) return;

    this.connection = { kind: 'done', outcome: connectionOutcome(result, draft.protocol) };
    if (result.kind === 'success' && this.title.trim().length === 0) {
      this.title = result.feedTitle;
    }
    if (
      result.kind === 'empty-title' ||
      result.kind === 'invalid-url' ||
      result.kind === 'missing-username'
    ) {
      this.#dialog.refuse(fieldRefusal(result));
    }
  }

  async save(): Promise<void> {
    const { dialog } = this.#dialog;
    if (dialog.kind !== 'editing' || this.saving) return;
    const { target } = dialog;

    this.saving = true;
    this.#dialog.refuse(null);
    try {
      const draft = this.#draft();
      const result =
        target.kind === 'add'
          ? await this.#adding.run(draft)
          : await this.#editing.run({ id: target.id, draft });
      this.#saved(result);
    } finally {
      this.saving = false;
    }
  }

  askRemove(catalog: Catalog): void {
    this.#dialog.remove({ id: catalog.id, name: catalog.title });
  }

  askRemoveUnreadable(id: CatalogId): void {
    this.#dialog.remove({ id, name: UNREADABLE_NAME });
  }

  dismissRemove(): void {
    if (this.#dialog.dialog.kind === 'removing') this.#dialog.close();
  }

  async confirmRemove(): Promise<void> {
    const { dialog } = this.#dialog;
    if (dialog.kind !== 'removing' || this.removeBusy) return;

    this.removeBusy = true;
    try {
      const result = await this.#removal.run(dialog.removal.id);
      if (result.kind === 'storage-unavailable') {
        this.#notify({ tone: 'danger', title: REMOVE_FAILED, message: STORAGE_BLOCKED });
        return;
      }
      this.dismissRemove();
    } finally {
      this.removeBusy = false;
    }
  }

  #saved(result: SavedResult): void {
    match(result)
      .with({ kind: 'success' }, ({ catalog }) => {
        if (catalog.auth.kind === 'basic' && this.password.length > 0) {
          this.#cases.unlockCatalog(catalog.id, this.password);
        }
        this.closeForm();
      })
      .with(
        { kind: 'empty-title' },
        { kind: 'invalid-url' },
        { kind: 'missing-username' },
        (refusal) => {
          this.#refuse(refusal);
        },
      )
      .with({ kind: 'storage-unavailable' }, () => {
        this.#notify({ tone: 'danger', title: SAVE_FAILED, message: STORAGE_BLOCKED });
      })
      .with({ kind: 'not-found' }, () => {
        this.#notify({ tone: 'warning', title: SAVE_FAILED, message: GONE });
        this.closeForm();
      })
      .with({ kind: 'unreadable' }, () => {
        this.#notify({ tone: 'warning', title: SAVE_FAILED, message: UNREADABLE });
      })
      .exhaustive();
  }

  #refuse(refusal: DraftRefusal): void {
    this.#dialog.refuse(fieldRefusal(refusal));
  }

  #open(
    target: FormTarget,
    title: string,
    rootUrl: string,
    authChoice: AuthChoice,
    username: string,
  ): void {
    this.#generation++;
    this.#dialog.edit(target);
    this.title = title;
    this.rootUrl = rootUrl;
    this.authChoice = authChoice;
    this.username = username;
    this.password = '';
    this.connection = IDLE;
  }

  #draft(): CatalogDraft {
    const auth =
      this.authChoice === 'basic'
        ? { kind: 'basic' as const, username: this.username }
        : { kind: 'none' as const };
    return {
      title: this.title,
      protocol: DEFAULT_CATALOG_PROTOCOL,
      rootUrl: this.rootUrl,
      auth,
    };
  }

  #typedPassword(): string | null {
    return this.password.length === 0 ? null : this.password;
  }

  #errorAt(field: FormField): string | undefined {
    const { dialog } = this.#dialog;
    if (dialog.kind !== 'editing') return undefined;
    const { refusal } = dialog;
    return refusal !== null && refusal.field === field ? refusal.text : undefined;
  }
}

export { CatalogSettingsView, GONE, REMOVE_FAILED, SAVE_FAILED, STORAGE_BLOCKED, UNREADABLE };
export type { AuthChoice, CatalogSettingsUseCases, ConnectionTest };
