<script lang="ts">
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { CATALOG_PORT_HREF } from '../architecture/architecture-sections';
  import { REMOTE_SECTIONS, remoteHref } from './remote-sections';
  import {
    ACQUISITION_TYPE,
    CATALOG_TYPE,
    ORIGIN_TYPE,
    PUBLICATION_TYPE,
    REMOTE_ITEM_TYPE,
  } from './remote-snippets';
</script>

<DocsSection title={REMOTE_SECTIONS.contract}>
  <p>
    Dokseo splits what it knows about a remote book into a book, a publication and an origin, joined
    by the pair <code>(catalogId, entryId)</code>, where <code>entryId</code> is the entry's
    <code>atom:id</code>.
  </p>
  <p>
    <code>Book</code> does not change. It means a held book, with its file in OPFS, and every field
    of it assumes the file is there. A remote book is a separate type, so nothing that reads a
    <code>Book</code> meets one with no file. The <code>reader</code> database and its stored format
    are untouched. The list of catalogs and the origins live in a separate IndexedDB database called
    <code>catalog-origins</code>, in two stores: <code>catalogs</code> and <code>origins</code>. A
    catalog is a remote server; the database holds no copy of its contents.
  </p>
  <p>
    A <code>Catalog</code> is a configured server. Its <code>protocol</code> names the feed format
    it speaks, which picks the adapter that reads it (<a href={CATALOG_PORT_HREF}
      >Catalog protocols behind one port</a
    >). Its <code>auth</code> names how to sign in, and never holds a password (<a
      href={remoteHref('credentials')}>Passwords</a
    >). The add form checks a draft before it saves: a title that is not empty, a root URL on HTTPS
    (or HTTP on <code>localhost</code> or <code>127.0.0.1</code>) with no credentials in it, and a
    username when the sign-in is <code>basic</code>.
  </p>
  <DocsCode label={CATALOG_TYPE.label} code={CATALOG_TYPE.code} />
  <p>
    A <code>RemotePublication</code> is one feed entry as the server sends it now. It is never
    stored. Its <code>acquisition</code> is the one link Dokseo can read (EPUB, CBZ/ZIP or PDF), or
    <code>null</code> when the entry offers none. The <code>feedPath</code> is the trail of feeds the
    entry was found under.
  </p>
  <DocsCode label={ACQUISITION_TYPE.label} code={ACQUISITION_TYPE.code} />
  <DocsCode label={PUBLICATION_TYPE.label} code={PUBLICATION_TYPE.code} />
  <p>
    A <code>BookOrigin</code> is the one stored record about a download, written for each one. A book
    has at most one origin, and a catalog entry belongs to at most one book, so downloading an entry again
    under a new book replaces the older origin.
  </p>
  <DocsCode label={ORIGIN_TYPE.label} code={ORIGIN_TYPE.code} />
  <p>
    Joining the publications of a feed with the origins gives the item a view shows. A remote entry
    is in one of six states, and the union is decided in the catalog domain. An entry is
    <code>held-older</code>
    when its <code>updated</code> is later than the origin's, and then the app offers to replace the file,
    never automatically. When a feed is read, the origins of the entries in it are checked against the
    library: an origin whose book is gone is deleted, and the entry shows as remote again.
  </p>
  <DocsCode label={REMOTE_ITEM_TYPE.label} code={REMOTE_ITEM_TYPE.code} />
  <p>
    The catalog is its own domain. It imports the library's <code>domain/</code> and
    <code>use-cases/</code>, and the composition passes it the library's <code>openFile</code>,
    <code>readBook</code> and <code>replaceBookFile</code> as functions. The library imports nothing from
    the catalog and stays a leaf. Where one screen needs both, the route composes them with snippets.
  </p>
</DocsSection>
