<script lang="ts">
  import Diagram from '$lib/ui/components/Diagram.svelte';
  import Figure from '$lib/ui/components/Figure.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { CATALOG_PORT_HREF } from '../architecture/architecture-sections';
  import { VIEWS } from './remote-diagrams';
  import { REMOTE_SECTIONS, remoteHref } from './remote-sections';

  const CATALOG_TYPES = `type Catalog = {
  readonly id: CatalogId;
  readonly title: string;
  readonly protocol: 'opds1';
  readonly rootUrl: string;
  readonly auth: { readonly kind: 'none' } | { readonly kind: 'basic'; readonly username: string };
};`;

  const PUBLICATION_TYPES = `type RemotePublication = {
  readonly catalogId: CatalogId;
  readonly entryId: string;
  readonly title: string;
  readonly authors: readonly string[];
  readonly language: Language | null;
  readonly updated: string;
  readonly cover: RemoteImage | null;
  readonly acquisition: Acquisition | null;
  readonly feedPath: FeedPath;
};`;

  const ORIGIN_TYPES = `type BookOrigin = {
  readonly bookId: BookId;
  readonly catalogId: CatalogId;
  readonly entryId: string;
  readonly acquisition: Acquisition;
  readonly updated: string;
  readonly feedPath: FeedPath;
  readonly feedPosition: number;
  readonly downloadedAt: number;
};`;

  const ITEM_TYPES = `type RemoteItem =
  | { readonly kind: 'remote'; readonly publication: RemotePublication }
  | { readonly kind: 'unsupported'; readonly publication: RemotePublication }
  | { readonly kind: 'downloading'; readonly publication: RemotePublication; readonly progress: number | null }
  | { readonly kind: 'download-failed'; readonly publication: RemotePublication; readonly reason: string }
  | { readonly kind: 'held'; readonly publication: RemotePublication; readonly book: Book }
  | { readonly kind: 'held-older'; readonly publication: RemotePublication; readonly book: Book };

type LocalItem = { readonly book: Book; readonly origins: readonly CatalogBadge[] };`;
</script>

<DocsSection title={REMOTE_SECTIONS.contract}>
  <p>
    The plan splits what Dokseo knows about a remote book into a book, a publication and an origin,
    joined by the pair <code>(catalogId, entryId)</code>, where <code>entryId</code> is the entry's
    <code>atom:id</code>. The code below is the planned type of each, a sketch and not a quote of
    source.
  </p>
  <p>
    <code>Book</code> does not change. It means a held book, with its file in OPFS, and every field
    of it assumes the file is there. A remote book is a separate type, so nothing that reads a
    <code>Book</code> meets one with no file. The <code>reader</code> database and its stored format
    stay as they are. The list of catalogs and the origins live in a new IndexedDB database called
    <code>catalog-origins</code>, so the change is additive. A catalog is a remote server; the
    database holds no copy of its contents.
  </p>
  <p>
    A <code>Catalog</code> is a configured server. Its <code>protocol</code> names the feed format
    it speaks, which picks the adapter that reads it (<a href={CATALOG_PORT_HREF}
      >Catalog protocols behind one port</a
    >). Its <code>auth</code> names how to sign in, and never holds a password (<a
      href={remoteHref('credentials')}>Credentials</a
    >).
  </p>
  <DocsCode label="Catalog" code={CATALOG_TYPES} />
  <p>
    A <code>RemotePublication</code> is one feed entry as the server sends it now. It is never
    stored. Its <code>acquisition</code> is the one link Dokseo can read (EPUB, CBZ/ZIP or PDF), or
    <code>null</code> when the entry offers none.
  </p>
  <DocsCode label="RemotePublication" code={PUBLICATION_TYPES} />
  <p>
    A <code>BookOrigin</code> is the one stored record, written for each download. A book may have several
    origins, for instance the same book in two catalogs. An origin has exactly one book.
  </p>
  <DocsCode label="BookOrigin" code={ORIGIN_TYPES} />
  <p>
    Joining the two with the held books gives the item a view shows. A remote entry is in one of six
    states, and the union is decided in the catalog domain. An entry is <code>held-older</code>
    when its <code>updated</code> is newer than the origin's, and then the app offers to replace the file,
    never automatically. The local view's item is a book with its origin badges.
  </p>
  <DocsCode label="RemoteItem and LocalItem" code={ITEM_TYPES} />
  <p>
    The catalog is a new domain that imports the library's <code>domain/</code> and
    <code>use-cases/</code>, to download through <code>openFile</code> and to find held books. The library
    stays a leaf, and the route composes the two.
  </p>
</DocsSection>

<DocsSection title={REMOTE_SECTIONS.views}>
  <p>
    The library screen gets one tab per catalog beside "On this device". "On this device" lists
    every held book, downloaded ones included. A book from a catalog shows a "from catalog" badge,
    and two filters narrow the list: one per catalog, and "Added from files" for books with no
    origin. A catalog tab lists the catalog's entries as <code>RemoteItem</code> values, with download,
    progress, open and update actions.
  </p>
  <Figure>
    <Diagram {...VIEWS} />
    {#snippet caption()}
      The two kinds of tab. A remote item moves to downloading when the reader asks for the book,
      and ends as held or as download-failed.
    {/snippet}
  </Figure>
  <p>
    A catalog tab fetches fresh each visit. Offline, it says it needs a connection. Nothing from the
    listing is stored, because stored catalog data would drift from the server's. The only stored
    remote data is the origin record of each downloaded book.
  </p>
  <p>
    Removing a downloaded book deletes its origins, so it shows as remote again. Removing a catalog
    deletes its origins and keeps the books.
  </p>
</DocsSection>
