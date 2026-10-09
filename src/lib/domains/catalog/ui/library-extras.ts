import type { QueryClient } from '@tanstack/svelte-query';
import type { Snippet } from 'svelte';
import type { BookId } from '$lib/shared/ids';
import type { BookMatching } from '$lib/domains/library/domain/book/book-matching';
import type { ReadingDefaults } from '$lib/domains/library/domain/book/reading-defaults';
import type { HeaderField } from './catalog-search';
import type { DescribeOpenFile } from './catalog-texts';

type LibraryNeeds = {
  readonly matching: () => BookMatching;
  readonly defaults: () => ReadingDefaults;
  readonly describeOpenFile: DescribeOpenFile;
  readonly refreshLibrary: (client: QueryClient) => Promise<void>;
  readonly readerHref: (id: BookId) => string;
};

type DeviceDetailsView = {
  readonly show: (id: BookId) => void;
  readonly hide: () => void;
};

type LibraryExtras = {
  readonly tabbed: Snippet<[Snippet]> | undefined;
  readonly bookBadge: Snippet<[BookId]> | undefined;
  readonly bookSource: Snippet<[BookId]> | undefined;
  readonly bookFilter: ((id: BookId) => boolean) | undefined;
  readonly filterControls: Snippet | undefined;
  readonly headerSearch: HeaderField | undefined;
};

export type { DeviceDetailsView, LibraryExtras, LibraryNeeds };
