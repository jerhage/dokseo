import { match } from 'ts-pattern';
import type { StatusVariant } from '$lib/ui/components/classes';
import type { Catalog } from '../domain/catalog';
import type { DraftRefusal, RootUrlProblem } from '../domain/catalog-draft';
import type { TestCatalogConnectionResult } from '../use-cases/test-catalog-connection';

type ConnectionOutcome = {
  readonly variant: StatusVariant;
  readonly text: string;
};

type FormField = 'title' | 'url' | 'username';

type FieldRefusal = {
  readonly field: FormField;
  readonly text: string;
};

const BLOCKED_TEXT =
  'The browser blocked the request. The usual causes: the server sends no CORS headers for this site; the address is on your local network and the browser blocked it (in Chrome, allow the "local network access" prompt for this site); or the address is not HTTPS.';

const FIX_FIELDS_TEXT = 'Fix the marked field, then test again.';

const PASSWORD_ASKED_EACH_SESSION = 'Password: asked each session';

function urlProblemText(problem: RootUrlProblem): string {
  return match(problem)
    .with('unparseable', () => 'Enter a full address, such as https://calibre.example/opds.')
    .with('insecure', () => 'Use an https:// address. Plain http works only for localhost.')
    .with('credentials', () => 'Leave the username and password out of the address.')
    .exhaustive();
}

function fieldRefusal(refusal: DraftRefusal): FieldRefusal {
  return match(refusal)
    .returnType<FieldRefusal>()
    .with({ kind: 'empty-title' }, () => ({ field: 'title', text: 'A catalog needs a name.' }))
    .with({ kind: 'invalid-url' }, ({ problem }) => ({
      field: 'url',
      text: urlProblemText(problem),
    }))
    .with({ kind: 'missing-username' }, () => ({
      field: 'username',
      text: 'Enter the username to sign in with.',
    }))
    .exhaustive();
}

function connectionOutcome(result: TestCatalogConnectionResult): ConnectionOutcome {
  return match(result)
    .returnType<ConnectionOutcome>()
    .with({ kind: 'success' }, ({ feedTitle }) => ({
      variant: 'success',
      text: `Connected: ${feedTitle}.`,
    }))
    .with({ kind: 'not-opds' }, () => ({
      variant: 'warning',
      text: 'This address answers, but not with an OPDS catalog.',
    }))
    .with({ kind: 'locked' }, () => ({
      variant: 'info',
      text: 'Enter the password to test the connection.',
    }))
    .with({ kind: 'empty-title' }, { kind: 'invalid-url' }, { kind: 'missing-username' }, () => ({
      variant: 'warning',
      text: FIX_FIELDS_TEXT,
    }))
    .with({ kind: 'unauthorized' }, () => ({
      variant: 'warning',
      text: 'The server refused the username or password.',
    }))
    .with({ kind: 'not-found' }, () => ({
      variant: 'warning',
      text: 'Nothing was found at that address.',
    }))
    .with({ kind: 'server-error' }, ({ status }) => ({
      variant: 'warning',
      text: `The server answered with an error (status ${status}).`,
    }))
    .with({ kind: 'blocked' }, () => ({ variant: 'warning', text: BLOCKED_TEXT }))
    .with({ kind: 'offline' }, () => ({
      variant: 'warning',
      text: 'You are offline. Connect to the network and try again.',
    }))
    .with({ kind: 'aborted' }, () => ({ variant: 'info', text: 'The test was cancelled.' }))
    .exhaustive();
}

function catalogHost(rootUrl: string): string {
  return URL.canParse(rootUrl) ? new URL(rootUrl).host : rootUrl;
}

function catalogDescription(catalog: Catalog): string {
  const host = catalogHost(catalog.rootUrl);
  if (catalog.auth.kind === 'none') return host;
  return `${host} · ${catalog.auth.username} · ${PASSWORD_ASKED_EACH_SESSION}`;
}

export {
  BLOCKED_TEXT,
  FIX_FIELDS_TEXT,
  PASSWORD_ASKED_EACH_SESSION,
  catalogDescription,
  catalogHost,
  connectionOutcome,
  fieldRefusal,
  urlProblemText,
};
export type { ConnectionOutcome, FieldRefusal, FormField };
