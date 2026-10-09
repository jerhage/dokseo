import type { Page } from '$lib/shared/page';
import type { Total } from '$lib/shared/read-paged-state';
import type { RemotePublication } from './remote-publication';

type FeedSearch = { readonly handle: string };

type FeedAddress = { readonly handle: string };

type TrailStep = { readonly title: string; readonly address: FeedAddress | null };

type FeedKind = 'navigation' | 'acquisition';

type NavigationLink = {
  readonly title: string;
  readonly address: FeedAddress;
  readonly summary: string;
};

type LinkEntry = { readonly kind: 'link'; readonly link: NavigationLink };

type PublicationEntry = { readonly kind: 'publication'; readonly publication: RemotePublication };

type FeedEntry = LinkEntry | PublicationEntry;

type FeedFields = {
  readonly id: string;
  readonly title: string;
  readonly address: FeedAddress;
  readonly search: FeedSearch | null;
  readonly total: Total;
};

type NavigationFeedPage = Page<LinkEntry, FeedAddress> &
  FeedFields & { readonly kind: 'navigation' };

type AcquisitionFeedPage = Page<PublicationEntry, FeedAddress> &
  FeedFields & { readonly kind: 'acquisition' };

type FeedPage = NavigationFeedPage | AcquisitionFeedPage;

type FeedHead = Pick<FeedPage, 'kind' | 'id' | 'title' | 'address' | 'search'>;

type FeedLocation =
  | { readonly kind: 'root' }
  | { readonly kind: 'address'; readonly address: FeedAddress }
  | { readonly kind: 'search'; readonly search: FeedSearch; readonly query: string };

const ROOT_LOCATION: FeedLocation = { kind: 'root' };

function addressKey(address: FeedAddress): string {
  return address.handle;
}

function linksOf(entries: readonly FeedEntry[]): readonly NavigationLink[] {
  return entries.flatMap((entry) => (entry.kind === 'link' ? [entry.link] : []));
}

function publicationsOf(entries: readonly FeedEntry[]): readonly RemotePublication[] {
  return entries.flatMap((entry) => (entry.kind === 'publication' ? [entry.publication] : []));
}

export { ROOT_LOCATION, addressKey, linksOf, publicationsOf };
export type {
  AcquisitionFeedPage,
  FeedAddress,
  FeedEntry,
  FeedHead,
  FeedKind,
  FeedLocation,
  FeedPage,
  FeedSearch,
  LinkEntry,
  NavigationFeedPage,
  NavigationLink,
  PublicationEntry,
  TrailStep,
};
