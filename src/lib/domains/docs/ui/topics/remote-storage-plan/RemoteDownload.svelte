<script lang="ts">
  import Diagram from '$lib/ui/components/Diagram.svelte';
  import Figure from '$lib/ui/components/Figure.svelte';
  import StepItem from '$lib/ui/components/StepItem.svelte';
  import StepList from '$lib/ui/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { DOWNLOAD_FLOW } from './remote-diagrams';
  import { REMOTE_SECTIONS, SERIES_FORMATS_HREF } from './remote-sections';
  import {
    DOWNLOAD_ORIGIN,
    FEED_PATH_LABEL,
    FEED_PATH_TYPE,
    OPFS_MOVE,
    PASSWORDS_PORT,
    PASSWORDS_SESSION,
    STAGED_SWAP,
  } from './remote-snippets';
</script>

<DocsSection title={REMOTE_SECTIONS.download}>
  <p>
    A download reuses the path an uploaded file takes, so identity, deduplication, the write to
    OPFS, the atomic add, the reading defaults and the persistence request all apply unchanged.
  </p>
  <StepList>
    <StepItem title="Fetch the file">
      The acquisition link is fetched as a blob and wrapped as a <code>File</code> named after the
      server's <code>Content-Disposition</code> name, or the entry's title. Progress reaches the
      item as <code>downloading</code>, and is unknown when the server gives no length.
    </StepItem>
    <StepItem title="Open it like any upload">
      The <code>File</code> goes to <code>openFile</code>, which answers <code>added</code> for a
      new book, <code>restored</code> when the file belongs to a book under Removed books, or
      <code>already-held</code> when a book with the same <code>contentHash</code> is already on the device.
      Any other answer is returned as the download's own failure and writes no origin.
    </StepItem>
    <StepItem title="Write the origin">
      On any of the three answers the use case writes the <code>BookOrigin</code> for that
      <code>bookId</code>. A book the reader added by hand and later downloads is linked to the
      catalog, not duplicated.
    </StepItem>
  </StepList>
  <DocsCode label={DOWNLOAD_ORIGIN.label} code={DOWNLOAD_ORIGIN.code} />
  <Figure>
    <Diagram {...DOWNLOAD_FLOW} />
    {#snippet caption()}
      A download. Both answers from <code>openFile</code> end in an origin record.
    {/snippet}
  </Figure>
</DocsSection>

<DocsSection title={REMOTE_SECTIONS.update}>
  <p>
    When a feed lists an entry whose <code>updated</code> is later than its origin's, the card reads "Newer
    on server" and offers "Replace with newer version" beside "Open". A button opens a modal that says
    the captures stay with the book but the newer file may have different pages, so a capture can point
    at the wrong place. Confirming downloads the file and replaces the held one while the card shows progress
    and a Cancel, as it does for a download. Nothing is replaced without that confirmation.
  </p>
  <p>
    The library's <code>replaceBookFile</code> fingerprints the new file with the same call
    <code>openFile</code> uses. It answers <code>same-file</code> when the bytes equal the book's
    own and <code>already-held</code> when another book has them, and never merges two books. For a new
    file it keeps the book's id, title, alias, series, volume, language, reading direction, pairing, added
    date and reading dates, so the captures, which are keyed by book id, are not touched. The reading
    place is clamped to the new page count, a text place stays as it is, and the place restarts when the
    layout changes between images and a flowing book.
  </p>
  <p>
    The files are swapped through a staged copy, so a failure while the new file is written leaves
    the old one in place. The new source and cover are written under a <code>.next</code> name, then each
    is moved over the old one, and a failure removes the staged files.
  </p>
  <DocsCode label={STAGED_SWAP.label} code={STAGED_SWAP.code} />
  <p>
    The move is <code>FileSystemFileHandle.move(parent, name)</code>, the form in the specification,
    with the directory and the new name. Safari rejects the one-argument form with "Not enough
    arguments". The move replaces an existing file and leaves no staged name behind in Chromium,
    Safari and Firefox. A browser without <code>move</code> fails the replace with a message instead of
    writing a second copy.
  </p>
  <DocsCode label={OPFS_MOVE.label} code={OPFS_MOVE.code} />
  <p>
    On success the origin takes the new <code>updated</code>, acquisition, feed path, position and
    download time, and a toast reads "Updated" and the title with an Open action. A
    <code>same-file</code> answer counts as success, because the server changed an entry's metadata and
    not its bytes. A failed update shows the failed card with Retry, and Retry on a held entry runs the
    update, never a second download.
  </p>
</DocsSection>

<DocsSection title={REMOTE_SECTIONS.series}>
  <p>
    OPDS has no series element, and Dokseo has no series view for catalogs. The library stays the
    flat list it is, downloaded books included. A catalog tab follows the server's own navigation
    feeds, because OPDS has no flat list of every book, and shows each feed's books in the server's
    order.
  </p>
  <p>
    Series and volumes are a later step, from the downloaded file's metadata (ComicInfo.xml, and the
    EPUB collection fields described in
    <a href={SERIES_FORMATS_HREF}>Series in book files</a>), with the catalog's feed as a fallback
    the reader confirms. So that step needs no migration, <code>BookOrigin</code> already stores the feed
    path an entry was found under and its position in that feed.
  </p>
  <p>
    The path is a list of steps, not a string such as "Manga > Series > Harbor Lights". A title can
    contain the separator, servers rename feeds, and two feeds can share a title. The feed URL
    identifies a level, and the title is only what is shown.
  </p>
  <DocsCode label={FEED_PATH_TYPE.label} code={FEED_PATH_TYPE.code} />
  <p>A joined label for display is computed from the list when it is needed.</p>
  <DocsCode label={FEED_PATH_LABEL.label} code={FEED_PATH_LABEL.code} />
</DocsSection>

<DocsSection title={REMOTE_SECTIONS.credentials}>
  <p>
    HTTP Basic sends the username and password with every request, so the app needs the password
    each time it talks to a catalog. Storing it as plain text in IndexedDB would leave it readable
    on the device, so Dokseo stores it nowhere. The password lives in memory for the session and no
    stored type has a field for it.
  </p>
  <DocsCode label={PASSWORDS_PORT.label} code={PASSWORDS_PORT.code} />
  <DocsCode label={PASSWORDS_SESSION.label} code={PASSWORDS_SESSION.code} />
  <ul class="col gap-2">
    <li>
      The add or edit form takes the password for the connection test. After a catalog with a
      <code>basic</code> sign-in is saved, the typed password is kept in that map. The field says "Kept
      until you close Dokseo".
    </li>
    <li>
      A <code>basic</code> catalog with no password in memory answers <code>locked</code> before any request
      is sent, so a locked catalog loads no adapter. The tab then opens a password modal, and the feed
      is read again once a password is entered. A refused password shows the same text as the connection
      test.
    </li>
    <li>
      Removing a catalog forgets its password. Closing Dokseo forgets all of them, and the next
      visit asks again.
    </li>
    <li>
      The setup I recommend avoids the question: the proxy in front of the server adds the
      credentials, so the app holds none. On a tailnet the server's own password can be off.
    </li>
  </ul>
</DocsSection>
