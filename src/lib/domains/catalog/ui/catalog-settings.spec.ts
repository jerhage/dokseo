import { describe, expect, it } from 'vitest';
import { catalogId } from '$lib/shared/ids';
import type { CatalogId } from '$lib/shared/ids';
import type { Notice } from '$lib/shared/notice';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { Catalog } from '../domain/catalog';
import type { CatalogDraft } from '../domain/catalog-draft';
import type { AddCatalogResult } from '../use-cases/add-catalog';
import type { EditCatalogResult } from '../use-cases/edit-catalog';
import type { ListCatalogsResult } from '../use-cases/list-catalogs';
import type { RemoveCatalogResult } from '../use-cases/remove-catalog';
import type { TestCatalogConnectionResult } from '../use-cases/test-catalog-connection';
import {
  CatalogSettingsView,
  GONE,
  REMOVE_FAILED,
  SAVE_FAILED,
  STORAGE_BLOCKED,
  UNREADABLE,
} from './catalog-settings.svelte';
import type { CatalogSettingsUseCases } from './catalog-settings.svelte';

const OPEN = catalogId('open');
const PRIVATE = catalogId('private');

const OPEN_CATALOG: Catalog = {
  id: OPEN,
  title: 'Home',
  rootUrl: 'https://home.example/opds',
  auth: { kind: 'none' },
};

const PRIVATE_CATALOG: Catalog = {
  id: PRIVATE,
  title: 'Shared',
  rootUrl: 'https://shared.example/opds',
  auth: { kind: 'basic', username: 'jo' },
};

type Answers = {
  list: ListCatalogsResult;
  add: (draft: CatalogDraft) => AddCatalogResult;
  edit: (id: CatalogId, draft: CatalogDraft) => EditCatalogResult;
  remove: RemoveCatalogResult;
  test: TestCatalogConnectionResult;
};

function setup(overrides: Partial<Answers> = {}) {
  const notices: Notice[] = [];
  const calls: string[] = [];
  const unlocked: { id: CatalogId; password: string }[] = [];
  const tested: { draft: CatalogDraft; password: string | null }[] = [];
  const answers: Answers = {
    list: { kind: 'success', catalogs: [OPEN_CATALOG], unreadable: [] },
    add: (draft) => ({ kind: 'success', catalog: { id: PRIVATE, ...draft } }),
    edit: (id, draft) => ({ kind: 'success', catalog: { id, ...draft } }),
    remove: { kind: 'success' },
    test: { kind: 'success', feedTitle: 'Sample Library', feedKind: 'navigation' },
    ...overrides,
  };
  const cases: CatalogSettingsUseCases = {
    listCatalogs: () => {
      calls.push('list');
      return Promise.resolve(answers.list);
    },
    addCatalog: (draft) => {
      calls.push('add');
      return Promise.resolve(answers.add(draft));
    },
    editCatalog: (id, draft) => {
      calls.push('edit');
      return Promise.resolve(answers.edit(id, draft));
    },
    removeCatalog: () => {
      calls.push('remove');
      return Promise.resolve(answers.remove);
    },
    unlockCatalog: (id, password) => {
      unlocked.push({ id, password });
      return { kind: 'success' };
    },
    testCatalogConnection: (draft, password) => {
      tested.push({ draft, password });
      return Promise.resolve(answers.test);
    },
  };
  const view = new CatalogSettingsView(cases, (notice) => notices.push(notice));
  return { view, notices, calls, unlocked, tested };
}

function fill(view: CatalogSettingsView, title: string, rootUrl: string): void {
  view.title = title;
  view.rootUrl = rootUrl;
}

describe('CatalogSettingsView list', () => {
  it('loads the catalogs and the ids of unreadable rows', async () => {
    const { view } = setup({
      list: {
        kind: 'success',
        catalogs: [OPEN_CATALOG],
        unreadable: [{ id: PRIVATE, stored: {} }],
      },
    });
    expect(view.list).toEqual({ kind: 'loading' });
    await view.load();
    expect(view.list).toEqual({ kind: 'ready', catalogs: [OPEN_CATALOG], unreadable: [PRIVATE] });
  });

  it('reports unavailable storage', async () => {
    const { view } = setup({ list: STORAGE_UNAVAILABLE });
    await view.load();
    expect(view.list).toEqual({ kind: 'storage-unavailable' });
  });
});

describe('CatalogSettingsView test connection', () => {
  it('prefills an empty name from the feed title', async () => {
    const { view } = setup();
    view.startAdd();
    fill(view, '  ', 'https://x.example/opds');
    await view.test();
    expect(view.title).toBe('Sample Library');
    expect(view.connection).toEqual({
      kind: 'done',
      outcome: { variant: 'success', text: 'Connected: Sample Library.' },
    });
  });

  it('keeps a typed name', async () => {
    const { view } = setup();
    view.startAdd();
    fill(view, 'Mine', 'https://x.example/opds');
    await view.test();
    expect(view.title).toBe('Mine');
  });

  it('sends the typed password, or null when none was typed', async () => {
    const { view, tested } = setup();
    view.startAdd();
    fill(view, 'Mine', 'https://x.example/opds');
    view.chooseAuth('basic');
    view.username = 'jo';
    await view.test();
    view.password = 'secret';
    await view.test();
    expect(tested.map((call) => call.password)).toEqual([null, 'secret']);
    expect(tested[1]?.draft.auth).toEqual({ kind: 'basic', username: 'jo' });
  });

  it('shows a refusal at the field it concerns', async () => {
    const { view } = setup({ test: { kind: 'invalid-url', problem: 'insecure' } });
    view.startAdd();
    fill(view, '', 'http://x.example');
    await view.test();
    expect(view.urlError).toBe('Use an https:// address. Plain http works only for localhost.');
    expect(view.titleError).toBeUndefined();
    expect(view.usernameError).toBeUndefined();
  });

  it('shows a failure as text and leaves the name empty', async () => {
    const { view } = setup({ test: { kind: 'unauthorized' } });
    view.startAdd();
    fill(view, '', 'https://x.example/opds');
    await view.test();
    expect(view.title).toBe('');
    expect(view.connection).toEqual({
      kind: 'done',
      outcome: { variant: 'warning', text: 'The server refused the username or password.' },
    });
  });

  it('drops the answer when the form closes meanwhile', async () => {
    const { view } = setup();
    view.startAdd();
    fill(view, '', 'https://x.example/opds');
    const pending = view.test();
    view.closeForm();
    await pending;
    expect(view.connection).toEqual({ kind: 'idle' });
    expect(view.title).toBe('');
  });

  it('forgets the previous outcome when the sign-in changes', async () => {
    const { view } = setup();
    view.startAdd();
    fill(view, 'Mine', 'https://x.example/opds');
    await view.test();
    view.chooseAuth('basic');
    expect(view.connection).toEqual({ kind: 'idle' });
  });
});

describe('CatalogSettingsView save', () => {
  it('adds a catalog, closes the form and reloads', async () => {
    const { view, calls } = setup();
    view.startAdd();
    fill(view, 'Mine', 'https://x.example/opds');
    await view.save();
    expect(calls).toEqual(['add', 'list']);
    expect(view.target).toBeNull();
  });

  it('unlocks a basic catalog with the typed password', async () => {
    const { view, unlocked } = setup();
    view.startAdd();
    fill(view, 'Mine', 'https://x.example/opds');
    view.chooseAuth('basic');
    view.username = 'jo';
    view.password = 'secret';
    await view.save();
    expect(unlocked).toEqual([{ id: PRIVATE, password: 'secret' }]);
    expect(view.password).toBe('');
  });

  it('unlocks nothing when no password was typed', async () => {
    const { view, unlocked } = setup();
    view.startAdd();
    fill(view, 'Mine', 'https://x.example/opds');
    view.chooseAuth('basic');
    view.username = 'jo';
    await view.save();
    expect(unlocked).toEqual([]);
  });

  it('unlocks nothing for a catalog without sign-in', async () => {
    const { view, unlocked } = setup();
    view.startAdd();
    fill(view, 'Mine', 'https://x.example/opds');
    view.password = 'left over';
    await view.save();
    expect(unlocked).toEqual([]);
  });

  it('keeps the form open and marks the name field for an empty name', async () => {
    const { view, calls } = setup({ add: () => ({ kind: 'empty-title' }) });
    view.startAdd();
    await view.save();
    expect(view.target).toEqual({ kind: 'add' });
    expect(view.titleError).toBe('A catalog needs a name.');
    expect(calls).toEqual(['add']);
  });

  it('marks the username field for a missing username', async () => {
    const { view } = setup({ add: () => ({ kind: 'missing-username' }) });
    view.startAdd();
    await view.save();
    expect(view.usernameError).toBe('Enter the username to sign in with.');
  });

  it('marks the address field with the problem text', async () => {
    const { view } = setup({ add: () => ({ kind: 'invalid-url', problem: 'unparseable' }) });
    view.startAdd();
    await view.save();
    expect(view.urlError).toBe('Enter a full address, such as https://calibre.example/opds.');
  });

  it('notifies when storage is unavailable and keeps the form', async () => {
    const { view, notices } = setup({ add: () => STORAGE_UNAVAILABLE });
    view.startAdd();
    await view.save();
    expect(notices).toEqual([{ tone: 'danger', title: SAVE_FAILED, message: STORAGE_BLOCKED }]);
    expect(view.target).toEqual({ kind: 'add' });
    expect(view.saving).toBe(false);
  });

  it('edits the catalog it was opened on', async () => {
    const { view, calls } = setup();
    view.startEdit(PRIVATE_CATALOG);
    expect(view.authChoice).toBe('basic');
    expect(view.username).toBe('jo');
    view.title = 'Renamed';
    await view.save();
    expect(calls).toEqual(['edit', 'list']);
    expect(view.target).toBeNull();
  });

  it('closes the form and reloads when the edited catalog is gone', async () => {
    const { view, notices, calls } = setup({ edit: (id) => ({ kind: 'not-found', id }) });
    view.startEdit(OPEN_CATALOG);
    await view.save();
    expect(notices).toEqual([{ tone: 'warning', title: SAVE_FAILED, message: GONE }]);
    expect(view.target).toBeNull();
    expect(calls).toEqual(['edit', 'list']);
  });

  it('tells the reader to remove an unreadable catalog', async () => {
    const { view, notices } = setup({ edit: (id) => ({ kind: 'unreadable', id }) });
    view.startEdit(OPEN_CATALOG);
    await view.save();
    expect(notices).toEqual([{ tone: 'warning', title: SAVE_FAILED, message: UNREADABLE }]);
    expect(view.target).not.toBeNull();
  });

  it('clears the previous form when it opens again', async () => {
    const { view } = setup({ add: () => ({ kind: 'empty-title' }) });
    view.startAdd();
    view.password = 'old';
    await view.save();
    view.closeForm();
    view.startAdd();
    expect(view.titleError).toBeUndefined();
    expect(view.password).toBe('');
    expect(view.title).toBe('');
  });
});

describe('CatalogSettingsView remove', () => {
  it('removes after confirmation and reloads', async () => {
    const { view, calls } = setup();
    view.askRemove(OPEN_CATALOG);
    expect(view.removing).toEqual({ id: OPEN, name: 'Home' });
    await view.confirmRemove();
    expect(calls).toEqual(['remove', 'list']);
    expect(view.removing).toBeNull();
  });

  it('removes nothing when dismissed', async () => {
    const { view, calls } = setup();
    view.askRemove(OPEN_CATALOG);
    view.dismissRemove();
    await view.confirmRemove();
    expect(calls).toEqual([]);
  });

  it('removes an unreadable catalog by id', async () => {
    const { view, calls } = setup();
    view.askRemoveUnreadable(PRIVATE);
    await view.confirmRemove();
    expect(calls).toEqual(['remove', 'list']);
  });

  it('notifies and keeps the confirmation when storage is unavailable', async () => {
    const { view, notices } = setup({ remove: STORAGE_UNAVAILABLE });
    view.askRemove(OPEN_CATALOG);
    await view.confirmRemove();
    expect(notices).toEqual([{ tone: 'danger', title: REMOVE_FAILED, message: STORAGE_BLOCKED }]);
    expect(view.removing).not.toBeNull();
    expect(view.removeBusy).toBe(false);
  });

  it('closes the confirmation when the catalog is already gone', async () => {
    const { view } = setup({ remove: { kind: 'not-found', id: OPEN } });
    view.askRemove(OPEN_CATALOG);
    await view.confirmRemove();
    expect(view.removing).toBeNull();
  });
});
