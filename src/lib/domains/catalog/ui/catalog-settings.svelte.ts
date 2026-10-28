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
  forgetCatalogPasswordMutation,
  removeCatalogMutation,
  testConnectionMutation,
  unlockCatalogMutation,
} from '../queries/catalog-queries';
import type {
  CatalogEdit,
  CatalogWrites,
  ConnectionRequest,
  UnlockRequest,
} from '../queries/catalog-queries';
import type { AddCatalogResult } from '../use-cases/add-catalog';
import type { EditCatalogResult } from '../use-cases/edit-catalog';
import type { RemoveCatalogResult } from '../use-cases/remove-catalog';
import type { TestCatalogConnectionResult } from '../use-cases/test-catalog-connection';
import type { ForgetCatalogPasswordResult } from '../use-cases/forget-catalog-password';
import type { UnlockCatalogResult } from '../use-cases/unlock-catalog';
import type { CatalogDialog, FormTarget, createCatalogDialog } from './catalog-dialog.svelte';
import { connectionOutcome, fieldRefusal } from './catalog-texts';
import { passwordChoiceOf } from './password-choice';
import type { ConnectionOutcome, FormField } from './catalog-texts';

type CatalogSettingsUseCases = CatalogWrites;

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

const FORGET_FAILED = 'Could not forget that password';

const NOT_REMEMBERED_TITLE = 'Password not saved';

const NOT_REMEMBERED_MESSAGE =
  'The password works for this session, but it could not be saved on this device.';

const FORGOTTEN_TITLE = 'Password forgotten on this device.';

const STORAGE_BLOCKED = 'This browser blocks local storage, so catalogs cannot be kept.';

const GONE = 'That catalog no longer exists.';

const UNREADABLE = 'That catalog could not be read, so it cannot be changed. Remove it instead.';

class CatalogSettingsView {
  title = $state('');
  rootUrl = $state('');
  authChoice = $state<AuthChoice>('none');
  username = $state('');
  password = $state('');
  remember = $state(false);
  connection = $state.raw<ConnectionTest>(IDLE);
  saving = $state(false);
  removeBusy = $state(false);

  #dialog: ReturnType<typeof createCatalogDialog>;
  #notify: Notify;
  #wasRemembered = $state(false);
  #generation = 0;
  #adding: WriteQuery<AddCatalogResult, CatalogDraft>;
  #editing: WriteQuery<EditCatalogResult, CatalogEdit>;
  #removal: WriteQuery<RemoveCatalogResult, CatalogId>;
  #testing: WriteQuery<TestCatalogConnectionResult, ConnectionRequest>;
  #unlocking: WriteQuery<UnlockCatalogResult, UnlockRequest>;
  #forgetting: WriteQuery<ForgetCatalogPasswordResult, CatalogId>;

  constructor(
    cases: CatalogSettingsUseCases,
    notify: Notify,
    dialog: ReturnType<typeof createCatalogDialog>,
  ) {
    const client = useQueryClient();
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
          client.invalidateQueries({ queryKey: catalogKeys.rememberedPasswords() }),
        ]);
      },
    }));
    this.#testing = writeQuery(() => testConnectionMutation(cases));
    this.#unlocking = writeQuery(() => ({
      ...unlockCatalogMutation(cases),
      onSettled: () => client.invalidateQueries({ queryKey: catalogKeys.rememberedPasswords() }),
    }));
    this.#forgetting = writeQuery(() => ({
      ...forgetCatalogPasswordMutation(cases),
      onSettled: () => client.invalidateQueries({ queryKey: catalogKeys.rememberedPasswords() }),
    }));
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

  get rememberDisabled(): boolean {
    const { dialog } = this.#dialog;
    return (
      dialog.kind === 'editing' &&
      dialog.target.kind === 'edit' &&
      this.password.length === 0 &&
      !this.#wasRemembered
    );
  }

  startAdd(): void {
    this.#open({ kind: 'add' }, '', '', 'none', '', false);
  }

  startEdit(catalog: Catalog, remembered: boolean): void {
    const username = catalog.auth.kind === 'basic' ? catalog.auth.username : '';
    this.#open(
      { kind: 'edit', id: catalog.id },
      catalog.title,
      catalog.rootUrl,
      catalog.auth.kind,
      username,
      remembered,
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

  async forgetPassword(id: CatalogId): Promise<void> {
    const forgotten = await this.#forget(id);
    if (forgotten) this.#notify({ tone: 'success', title: FORGOTTEN_TITLE });
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
        const choice = passwordChoiceOf({
          authKind: catalog.auth.kind,
          typed: this.password.length > 0,
          remember: this.remember,
          wasRemembered: this.#wasRemembered,
        });
        match(choice)
          .with({ kind: 'unlock' }, ({ remember }) => {
            void this.#unlock({ id: catalog.id, password: this.password, remember });
          })
          .with({ kind: 'forget' }, () => {
            void this.#forget(catalog.id);
          })
          .with({ kind: 'keep' }, () => undefined)
          .exhaustive();
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

  async #unlock(request: UnlockRequest): Promise<void> {
    const result = await this.#unlocking.run(request);
    if (result.kind === 'not-remembered') {
      this.#notify({
        tone: 'warning',
        title: NOT_REMEMBERED_TITLE,
        message: NOT_REMEMBERED_MESSAGE,
      });
    }
  }

  async #forget(id: CatalogId): Promise<boolean> {
    const result = await this.#forgetting.run(id);
    if (result.kind === 'storage-unavailable') {
      this.#notify({ tone: 'danger', title: FORGET_FAILED, message: STORAGE_BLOCKED });
      return false;
    }
    return true;
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
    remembered: boolean,
  ): void {
    this.#generation++;
    this.#dialog.edit(target);
    this.title = title;
    this.rootUrl = rootUrl;
    this.authChoice = authChoice;
    this.username = username;
    this.password = '';
    this.remember = remembered;
    this.#wasRemembered = remembered;
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

export {
  CatalogSettingsView,
  FORGET_FAILED,
  FORGOTTEN_TITLE,
  GONE,
  NOT_REMEMBERED_TITLE,
  REMOVE_FAILED,
  SAVE_FAILED,
  STORAGE_BLOCKED,
  UNREADABLE,
};
export type { AuthChoice, CatalogSettingsUseCases, ConnectionTest };
