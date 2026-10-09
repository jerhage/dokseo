import type { RemotePublication } from './remote-publication';

type FeedSearch = { readonly handle: string };

type FeedAddress = { readonly handle: string };

type TrailStep = { readonly title: string; readonly address: FeedAddress | null };

type FeedPaging = { readonly next: FeedAddress | null };

type NavigationLink = {
  readonly title: string;
  readonly address: FeedAddress;
  readonly summary: string;
};

function addressKey(address: FeedAddress): string {
  return address.handle;
}

function sameFeedAddress(left: FeedAddress | null, right: FeedAddress | null): boolean {
  if (left === null || right === null) return left === right;
  return addressKey(left) === addressKey(right);
}

type NavigationFeed = {
  readonly id: string;
  readonly title: string;
  readonly address: FeedAddress;
  readonly paging: FeedPaging;
  readonly search: FeedSearch | null;
  readonly links: readonly NavigationLink[];
};

type AcquisitionFeed = {
  readonly id: string;
  readonly title: string;
  readonly address: FeedAddress;
  readonly paging: FeedPaging;
  readonly search: FeedSearch | null;
  readonly publications: readonly RemotePublication[];
};

type CatalogFeed =
  | { readonly kind: 'navigation'; readonly feed: NavigationFeed }
  | { readonly kind: 'acquisition'; readonly feed: AcquisitionFeed };

export { addressKey, sameFeedAddress };
export type {
  AcquisitionFeed,
  CatalogFeed,
  FeedAddress,
  FeedPaging,
  FeedSearch,
  NavigationFeed,
  NavigationLink,
  TrailStep,
};
