import { match } from 'ts-pattern';
import type { PagedProblem } from '$lib/shared/read-paged-state';
import type { StatusVariant } from '$lib/ui/components/classes';
import type { Catalog } from '../domain/catalog';
import type { DraftRefusal, RootUrlProblem } from '../domain/catalog-draft';
import type { CatalogProtocol } from '../domain/catalog-protocol';
import type { OpenFileFailure } from '$lib/domains/library/use-cases/open-file';
import type { FeedProblem } from '../queries/catalog-feed-queries';
import type { BrowseCatalogResult } from '../use-cases/browse-catalog';
import type { DownloadPublicationResult } from '../use-cases/download-publication';
import type { TestCatalogConnectionResult } from '../use-cases/test-catalog-connection';
import type { UpdatePublicationResult } from '../use-cases/update-publication';

type ConnectionOutcome = {
  readonly variant: StatusVariant;
  readonly text: string;
};

type FormField = 'title' | 'url' | 'username';

type FieldRefusal = {
  readonly field: FormField;
  readonly text: string;
};

const UNSUPPORTED_TEXT = 'No EPUB, PDF or CBZ file';

const BLOCKED_TEXT =
  'The browser blocked the request. The usual causes: the server sends no CORS headers for this site; the address is on your local network and the browser blocked it (in Chrome, allow the "local network access" prompt for this site); or the address is not HTTPS.';

const UNAUTHORIZED_TEXT = 'The server refused the username or password.';

const NOT_FOUND_TEXT = 'Nothing was found at that address.';

const OFFLINE_CATALOG_TEXT =
  'This catalog needs a connection. Books you downloaded stay readable under "On this device".';

const FIX_FIELDS_TEXT = 'Fix the marked field, then test again.';

const PASSWORD_ASKED_EACH_SESSION = 'Password: asked each session';

const PASSWORD_REMEMBERED = 'Password: remembered on this device';

const REMEMBER_PASSWORD_LABEL = 'Remember the password on this device';

const REMEMBER_PASSWORD_HINT = 'Only on a personal device, never on a shared or public one.';

const REMEMBER_PASSWORD_WARNING =
  'Anyone who can open Dokseo on this device can browse and download from this catalog with your account. Remember a password only on a device that is yours alone.';

const PASSWORD_KEPT_FOR_SESSION = 'Kept until you close Dokseo.';

const PASSWORD_KEPT_ON_DEVICE = 'Kept on this device, encrypted, until you forget it.';

function passwordHint(remember: boolean): string {
  return remember ? PASSWORD_KEPT_ON_DEVICE : PASSWORD_KEPT_FOR_SESSION;
}

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

function serverErrorText(status: number): string {
  return `The server answered with an error (status ${status}).`;
}

function connectionOutcome(
  result: TestCatalogConnectionResult,
  protocol: CatalogProtocol,
): ConnectionOutcome {
  return match(result)
    .returnType<ConnectionOutcome>()
    .with({ kind: 'success' }, ({ feedTitle }) => ({
      variant: 'success',
      text: `Connected: ${feedTitle}.`,
    }))
    .with({ kind: 'not-a-catalog' }, () => ({
      variant: 'warning',
      text: notACatalogText(protocol),
    }))
    .with({ kind: 'feed-too-large' }, () => ({ variant: 'warning', text: FEED_TOO_LARGE_TEXT }))
    .with({ kind: 'locked' }, () => ({
      variant: 'info',
      text: 'Enter the password to test the connection.',
    }))
    .with({ kind: 'empty-title' }, { kind: 'invalid-url' }, { kind: 'missing-username' }, () => ({
      variant: 'warning',
      text: FIX_FIELDS_TEXT,
    }))
    .with({ kind: 'unauthorized' }, () => ({ variant: 'warning', text: UNAUTHORIZED_TEXT }))
    .with({ kind: 'not-found' }, () => ({ variant: 'warning', text: NOT_FOUND_TEXT }))
    .with({ kind: 'server-error' }, ({ status }) => ({
      variant: 'warning',
      text: serverErrorText(status),
    }))
    .with({ kind: 'blocked' }, () => ({ variant: 'warning', text: BLOCKED_TEXT }))
    .with({ kind: 'offline' }, () => ({
      variant: 'warning',
      text: 'You are offline. Connect to the network and try again.',
    }))
    .with({ kind: 'aborted' }, () => ({ variant: 'info', text: 'The test was cancelled.' }))
    .exhaustive();
}

type BrowseFailure = Exclude<
  BrowseCatalogResult,
  { readonly kind: 'success' | 'locked' | 'unauthorized' | 'aborted' }
>;

type DownloadFailure = Exclude<DownloadPublicationResult, { readonly kind: 'success' }>;

type UpdateFailure = Exclude<UpdatePublicationResult, { readonly kind: 'success' }>;

type DescribeOpenFile = (failure: OpenFileFailure) => string;

const STORAGE_BLOCKED_TEXT = 'This browser blocks local storage, so catalogs cannot be kept.';

const UNKNOWN_CATALOG_TEXT = 'That catalog no longer exists.';

const FEED_TOO_LARGE_TEXT =
  'That feed is too large to read. Narrow the search, or open a smaller part of the catalog.';

const UNREADABLE_CATALOG_TEXT =
  'That catalog could not be read. Remove it in Settings, then add it again.';

function notACatalogText(protocol: CatalogProtocol): string {
  return match(protocol)
    .with('opds1', () => 'This address answers, but not with an OPDS catalog.')
    .exhaustive();
}

function browseFailureText(failure: BrowseFailure, protocol: CatalogProtocol): string {
  return match(failure)
    .returnType<string>()
    .with({ kind: 'not-a-catalog' }, () => notACatalogText(protocol))
    .with({ kind: 'feed-too-large' }, () => FEED_TOO_LARGE_TEXT)
    .with({ kind: 'not-found' }, () => NOT_FOUND_TEXT)
    .with({ kind: 'server-error' }, ({ status }) => serverErrorText(status))
    .with({ kind: 'blocked' }, () => BLOCKED_TEXT)
    .with({ kind: 'offline' }, () => OFFLINE_CATALOG_TEXT)
    .with({ kind: 'unknown-catalog' }, () => UNKNOWN_CATALOG_TEXT)
    .with({ kind: 'unreadable-catalog' }, () => UNREADABLE_CATALOG_TEXT)
    .with({ kind: 'storage-unavailable' }, () => STORAGE_BLOCKED_TEXT)
    .exhaustive();
}

const PASSWORD_NEEDED_TEXT = 'This catalog needs its password.';

function feedProblemText(problem: PagedProblem<FeedProblem>, protocol: CatalogProtocol): string {
  return match(problem)
    .returnType<string>()
    .with({ kind: 'locked' }, () => PASSWORD_NEEDED_TEXT)
    .with({ kind: 'unauthorized' }, () => UNAUTHORIZED_TEXT)
    .with({ kind: 'unexpected' }, ({ message }) => message)
    .with(
      { kind: 'not-a-catalog' },
      { kind: 'feed-too-large' },
      { kind: 'not-found' },
      { kind: 'server-error' },
      { kind: 'blocked' },
      { kind: 'offline' },
      { kind: 'unknown-catalog' },
      { kind: 'unreadable-catalog' },
      { kind: 'storage-unavailable' },
      (failure) => browseFailureText(failure, protocol),
    )
    .exhaustive();
}

function downloadFailureText(failure: DownloadFailure, describeOpenFile: DescribeOpenFile): string {
  return match(failure)
    .returnType<string>()
    .with({ kind: 'unauthorized' }, { kind: 'locked' }, () => UNAUTHORIZED_TEXT)
    .with({ kind: 'not-found' }, () => 'The server no longer has that file.')
    .with({ kind: 'server-error' }, ({ status }) => serverErrorText(status))
    .with({ kind: 'blocked' }, () => BLOCKED_TEXT)
    .with({ kind: 'offline' }, () => 'You are offline. Connect to the network and try again.')
    .with({ kind: 'aborted' }, () => 'The download was cancelled.')
    .with({ kind: 'unknown-catalog' }, () => UNKNOWN_CATALOG_TEXT)
    .with({ kind: 'unreadable-catalog' }, () => UNREADABLE_CATALOG_TEXT)
    .with({ kind: 'storage-unavailable' }, () => STORAGE_BLOCKED_TEXT)
    .with(
      { kind: 'source' },
      { kind: 'epub' },
      { kind: 'not-paged' },
      { kind: 'fingerprint' },
      (opening) => describeOpenFile(opening),
    )
    .exhaustive();
}

const FORMAT_CHOICE_TEXT = 'Open the book and choose which file to download.';

const BOOK_MISSING_TEXT = 'That book is no longer on this device.';

const FILE_HELD_TEXT = 'Another book on this device already has the newer file.';

function updateFailureText(failure: UpdateFailure, describeOpenFile: DescribeOpenFile): string {
  if (failure.kind === 'book-missing') return BOOK_MISSING_TEXT;
  if (failure.kind === 'already-held') return FILE_HELD_TEXT;
  if (failure.kind === 'format-choice') return FORMAT_CHOICE_TEXT;
  return downloadFailureText(failure, describeOpenFile);
}

function needsPickText(count: number): string {
  const books = count === 1 ? 'book offers' : 'books offer';
  return `${count} ${books} several files. Open each one to choose which file to download.`;
}

function catalogHost(rootUrl: string): string {
  return URL.canParse(rootUrl) ? new URL(rootUrl).host : rootUrl;
}

function catalogDescription(catalog: Catalog, remembered: boolean): string {
  const host = catalogHost(catalog.rootUrl);
  if (catalog.auth.kind === 'none') return host;
  const password = remembered ? PASSWORD_REMEMBERED : PASSWORD_ASKED_EACH_SESSION;
  return `${host} · ${catalog.auth.username} · ${password}`;
}

export {
  BLOCKED_TEXT,
  FEED_TOO_LARGE_TEXT,
  FORMAT_CHOICE_TEXT,
  NOT_FOUND_TEXT,
  OFFLINE_CATALOG_TEXT,
  PASSWORD_NEEDED_TEXT,
  UNAUTHORIZED_TEXT,
  UNSUPPORTED_TEXT,
  browseFailureText,
  downloadFailureText,
  feedProblemText,
  needsPickText,
  passwordHint,
  updateFailureText,
  FIX_FIELDS_TEXT,
  PASSWORD_ASKED_EACH_SESSION,
  PASSWORD_REMEMBERED,
  REMEMBER_PASSWORD_HINT,
  REMEMBER_PASSWORD_LABEL,
  REMEMBER_PASSWORD_WARNING,
  catalogDescription,
  catalogHost,
  connectionOutcome,
  fieldRefusal,
  urlProblemText,
};
export type {
  BrowseFailure,
  ConnectionOutcome,
  DescribeOpenFile,
  DownloadFailure,
  FieldRefusal,
  FormField,
  UpdateFailure,
};
