import type { RemotePublication } from './remote-publication';

type FeedSearch = { readonly handle: string };

type FeedPaging = {
  readonly next: string | null;
  readonly previous: string | null;
  readonly first: string | null;
  readonly last: string | null;
};

type NavigationLink = {
  readonly title: string;
  readonly href: string;
  readonly summary: string;
};

type NavigationFeed = {
  readonly id: string;
  readonly title: string;
  readonly address: string;
  readonly paging: FeedPaging;
  readonly search: FeedSearch | null;
  readonly links: readonly NavigationLink[];
};

type AcquisitionFeed = {
  readonly id: string;
  readonly title: string;
  readonly address: string;
  readonly paging: FeedPaging;
  readonly search: FeedSearch | null;
  readonly publications: readonly RemotePublication[];
};

type CatalogFeed =
  | { readonly kind: 'navigation'; readonly feed: NavigationFeed }
  | { readonly kind: 'acquisition'; readonly feed: AcquisitionFeed };

export type {
  AcquisitionFeed,
  CatalogFeed,
  FeedPaging,
  FeedSearch,
  NavigationFeed,
  NavigationLink,
};
