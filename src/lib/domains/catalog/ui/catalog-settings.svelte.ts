import { match } from 'ts-pattern';
import type { CatalogId } from '$lib/shared/ids';
import type { Notify } from '$lib/shared/notice';
import type { Catalog } from '../domain/catalog';
import type { CatalogDraft, DraftRefusal } from '../domain/catalog-draft';
import type { AddCatalogResult } from '../use-cases/add-catalog';
import type { EditCatalogResult } from '../use-cases/edit-catalog';
import type { ListCatalogsResult } from '../use-cases/list-catalogs';
import type { RemoveCatalogResult } from '../use-cases/remove-catalog';
import type { TestCatalogConnectionResult } from '../use-cases/test-catalog-connection';
import type { UnlockCatalogResult } from '../use-cases/unlock-catalog';
import { connectionOutcome, fieldRefusal } from './catalog-texts';
import type { ConnectionOutcome, FormField } from './catalog-texts';

type CatalogSettingsUseCases = {
  readonly listCatalogs: () => Promise<ListCatalogsResult>;
  readonly addCatalog: (draft: CatalogDraft) => Promise<AddCatalogResult>;
  readonly editCatalog: (id: CatalogId, draft: CatalogDraft) => Promise<EditCatalogResult>;
  readonly removeCatalog: (id: CatalogId) => Promise<RemoveCatalogResult>;
  readonly unlockCatalog: (id: CatalogId, password: string) => UnlockCatalogResult;
  readonly testCatalogConnection: (
    draft: CatalogDraft,
    password: string | null,
  ) => Promise<TestCatalogConnectionResult>;
};

type AuthChoice = 'none' | 'basic';

type CatalogListState =
  | { readonly kind: 'loading' }
  | {
      readonly kind: 'ready';
      readonly catalogs: readonly Catalog[];
      readonly unreadable: readonly CatalogId[];
    }
  | { readonly kind: 'storage-unavailable' };

type FormTarget = { readonly kind: 'add' } | { readonly kind: 'edit'; readonly id: CatalogId };

type ConnectionTest =
  | { readonly kind: 'idle' }
  | { readonly kind: 'testing' }
  | { readonly kind: 'done'; readonly outcome: ConnectionOutcome };

type RemovalTarget = { readonly id: CatalogId; readonly name: string };

type SavedResult = AddCatalogResult | EditCatalogResult;

type ShownRefusal = { readonly field: FormField; readonly text: string };

const IDLE: ConnectionTest = { kind: 'idle' };

const UNREADABLE_NAME = 'this unreadable catalog';

const SAVE_FAILED = 'Could not save that catalog';

const REMOVE_FAILED = 'Could not remove that catalog';

const STORAGE_BLOCKED = 'This browser blocks local storage, so catalogs cannot be kept.';

const GONE = 'That catalog no longer exists.';

const UNREADABLE = 'That catalog could not be read, so it cannot be changed. Remove it instead.';

class CatalogSettingsView {
  list = $state.raw<CatalogListState>({ kind: 'loading' });
  target = $state.raw<FormTarget | null>(null);
  title = $state('');
  rootUrl = $state('');
  authChoice = $state<AuthChoice>('none');
  username = $state('');
  password = $state('');
  refusal = $state.raw<ShownRefusal | null>(null);
  connection = $state.raw<ConnectionTest>(IDLE);
  saving = $state(false);
  removing = $state.raw<RemovalTarget | null>(null);
  removeBusy = $state(false);

  #cases: CatalogSettingsUseCases;
  #notify: Notify;
  #generation = 0;

  constructor(cases: CatalogSettingsUseCases, notify: Notify) {
    this.#cases = cases;
    this.#notify = notify;
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

  async load(): Promise<void> {
    const listed = await this.#cases.listCatalogs();
    this.list = match(listed)
      .returnType<CatalogListState>()
      .with({ kind: 'success' }, ({ catalogs, unreadable }) => ({
        kind: 'ready',
        catalogs,
        unreadable: unreadable.map((row) => row.id),
      }))
      .with({ kind: 'storage-unavailable' }, () => ({ kind: 'storage-unavailable' }))
      .exhaustive();
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
    this.target = null;
    this.password = '';
    this.refusal = null;
    this.connection = IDLE;
  }

  chooseAuth(choice: AuthChoice): void {
    this.authChoice = choice;
    this.connection = IDLE;
  }

  async test(): Promise<void> {
    if (this.connection.kind === 'testing' || this.saving) return;

    const generation = ++this.#generation;
    this.refusal = null;
    this.connection = { kind: 'testing' };
    const result = await this.#cases.testCatalogConnection(this.#draft(), this.#typedPassword());
    if (generation !== this.#generation) return;

    this.connection = { kind: 'done', outcome: connectionOutcome(result) };
    if (result.kind === 'success' && this.title.trim().length === 0) {
      this.title = result.feedTitle;
    }
    if (
      result.kind === 'empty-title' ||
      result.kind === 'invalid-url' ||
      result.kind === 'missing-username'
    ) {
      this.refusal = fieldRefusal(result);
    }
  }

  async save(): Promise<void> {
    const target = this.target;
    if (target === null || this.saving) return;

    this.saving = true;
    this.refusal = null;
    try {
      const draft = this.#draft();
      const result =
        target.kind === 'add'
          ? await this.#cases.addCatalog(draft)
          : await this.#cases.editCatalog(target.id, draft);
      await this.#saved(result);
    } finally {
      this.saving = false;
    }
  }

  askRemove(catalog: Catalog): void {
    this.removing = { id: catalog.id, name: catalog.title };
  }

  askRemoveUnreadable(id: CatalogId): void {
    this.removing = { id, name: UNREADABLE_NAME };
  }

  dismissRemove(): void {
    this.removing = null;
  }

  async confirmRemove(): Promise<void> {
    const removing = this.removing;
    if (removing === null || this.removeBusy) return;

    this.removeBusy = true;
    try {
      const result = await this.#cases.removeCatalog(removing.id);
      if (result.kind === 'storage-unavailable') {
        this.#notify({ tone: 'danger', title: REMOVE_FAILED, message: STORAGE_BLOCKED });
        return;
      }
      this.removing = null;
      await this.load();
    } finally {
      this.removeBusy = false;
    }
  }

  async #saved(result: SavedResult): Promise<void> {
    await match(result)
      .with({ kind: 'success' }, async ({ catalog }) => {
        if (catalog.auth.kind === 'basic' && this.password.length > 0) {
          this.#cases.unlockCatalog(catalog.id, this.password);
        }
        this.closeForm();
        await this.load();
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
      .with({ kind: 'not-found' }, async () => {
        this.#notify({ tone: 'warning', title: SAVE_FAILED, message: GONE });
        this.closeForm();
        await this.load();
      })
      .with({ kind: 'unreadable' }, () => {
        this.#notify({ tone: 'warning', title: SAVE_FAILED, message: UNREADABLE });
      })
      .exhaustive();
  }

  #refuse(refusal: DraftRefusal): void {
    this.refusal = fieldRefusal(refusal);
  }

  #open(
    target: FormTarget,
    title: string,
    rootUrl: string,
    authChoice: AuthChoice,
    username: string,
  ): void {
    this.#generation++;
    this.target = target;
    this.title = title;
    this.rootUrl = rootUrl;
    this.authChoice = authChoice;
    this.username = username;
    this.password = '';
    this.refusal = null;
    this.connection = IDLE;
  }

  #draft(): CatalogDraft {
    const auth =
      this.authChoice === 'basic'
        ? { kind: 'basic' as const, username: this.username }
        : { kind: 'none' as const };
    return { title: this.title, rootUrl: this.rootUrl, auth };
  }

  #typedPassword(): string | null {
    return this.password.length === 0 ? null : this.password;
  }

  #errorAt(field: FormField): string | undefined {
    const refusal = this.refusal;
    return refusal !== null && refusal.field === field ? refusal.text : undefined;
  }
}

export { CatalogSettingsView, GONE, REMOVE_FAILED, SAVE_FAILED, STORAGE_BLOCKED, UNREADABLE };
export type {
  AuthChoice,
  CatalogListState,
  CatalogSettingsUseCases,
  ConnectionTest,
  FormTarget,
  RemovalTarget,
};
