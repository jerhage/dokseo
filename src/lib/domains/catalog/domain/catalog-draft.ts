import type { CatalogAuth } from './catalog';

type CatalogDraft = {
  readonly title: string;
  readonly rootUrl: string;
  readonly auth: CatalogAuth;
};

type RootUrlProblem = 'unparseable' | 'insecure' | 'credentials';

type DraftCheck =
  | { readonly kind: 'valid'; readonly draft: CatalogDraft }
  | { readonly kind: 'invalid-url'; readonly problem: RootUrlProblem }
  | { readonly kind: 'empty-title' }
  | { readonly kind: 'missing-username' };

type DraftRefusal = Exclude<DraftCheck, { readonly kind: 'valid' }>;

const LOCAL_HOSTS: ReadonlySet<string> = new Set(['localhost', '127.0.0.1']);

function parsedUrl(raw: string): URL | null {
  return URL.canParse(raw) ? new URL(raw) : null;
}

function rootUrlProblem(raw: string): RootUrlProblem | null {
  const url = parsedUrl(raw);
  if (url === null) return 'unparseable';
  const secure = url.protocol === 'https:';
  const local = url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname);
  if (!secure && !local) return 'insecure';
  if (url.username !== '' || url.password !== '') return 'credentials';
  return null;
}

function checkedDraft(draft: CatalogDraft): DraftCheck {
  const title = draft.title.trim();
  if (title.length === 0) return { kind: 'empty-title' };

  const rootUrl = draft.rootUrl.trim();
  const problem = rootUrlProblem(rootUrl);
  if (problem !== null) return { kind: 'invalid-url', problem };

  if (draft.auth.kind === 'basic') {
    const username = draft.auth.username.trim();
    if (username.length === 0) return { kind: 'missing-username' };
    return {
      kind: 'valid',
      draft: { title, rootUrl: new URL(rootUrl).href, auth: { kind: 'basic', username } },
    };
  }
  return {
    kind: 'valid',
    draft: { title, rootUrl: new URL(rootUrl).href, auth: { kind: 'none' } },
  };
}

export { checkedDraft };
export type { CatalogDraft, DraftCheck, DraftRefusal, RootUrlProblem };
