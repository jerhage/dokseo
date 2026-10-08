<script lang="ts">
  import Diagram from '$lib/ui/components/Diagram.svelte';
  import Figure from '$lib/ui/components/Figure.svelte';
  import StepItem from '$lib/ui/components/StepItem.svelte';
  import StepList from '$lib/ui/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { DOWNLOAD_FLOW } from './remote-diagrams';
  import { REMOTE_SECTIONS, SERIES_FORMATS_HREF } from './remote-sections';

  const FEED_PATH_TYPES = `type FeedStep = { readonly title: string; readonly href: string };

type FeedPath = readonly FeedStep[];

const shown = path.map((step) => step.title).join(' › ');`;
</script>

<DocsSection title={REMOTE_SECTIONS.download}>
  <p>
    A download reuses the path an uploaded file takes, so identity, deduplication, the write to
    OPFS, the atomic add, the reading defaults and the persistence request all apply unchanged.
  </p>
  <StepList>
    <StepItem title="Fetch the file">
      The acquisition link is fetched as a blob and wrapped as a <code>File</code> named after the
      entry. Progress reaches the item as <code>downloading</code>.
    </StepItem>
    <StepItem title="Open it like any upload">
      The <code>File</code> goes to <code>openFile</code>, which answers <code>added</code> for a
      new book or <code>already-held</code> when a book with the same <code>contentHash</code> is already
      on the device.
    </StepItem>
    <StepItem title="Write the origin">
      On either answer the app writes the <code>BookOrigin</code> for that <code>bookId</code>. A
      book the reader added by hand and later downloads is linked to the catalog, not duplicated.
    </StepItem>
  </StepList>
  <Figure>
    <Diagram {...DOWNLOAD_FLOW} />
    {#snippet caption()}
      A download. Both answers from <code>openFile</code> end in an origin record.
    {/snippet}
  </Figure>
  <p>
    The reader can download one book, or a whole feed as a queue that runs one file at a time and
    shows progress.
  </p>
</DocsSection>

<DocsSection title={REMOTE_SECTIONS.series}>
  <p>
    OPDS has no series element, and the first version has no series view. The library stays the flat
    list it is today, downloaded books included. A catalog tab follows the server's own navigation
    feeds, because OPDS has no flat list of every book, and shows each feed's books in the server's
    order.
  </p>
  <p>
    Series and volumes come later, from the downloaded file's metadata (ComicInfo.xml, and the EPUB
    collection fields described in
    <a href={SERIES_FORMATS_HREF}>Series in book files</a>), with the catalog's feed as a fallback
    the reader confirms. So that step needs no migration, <code>BookOrigin</code> already stores the feed
    path an entry was found under and its position in that feed.
  </p>
  <p>
    The path is a list of steps, not a string such as "Manga > Series > Harbor Lights". A title can
    contain the separator, servers rename feeds, and two feeds can share a title. The feed URL
    identifies a level, and the title is only what is shown.
  </p>
  <DocsCode label="FeedPath" code={FEED_PATH_TYPES} />
  <p>A joined string for filtering can be computed from the list later.</p>
</DocsSection>

<DocsSection title={REMOTE_SECTIONS.credentials}>
  <p>
    HTTP Basic sends the username and password with every request, so the app needs the password
    each time it talks to a catalog. Storing it as plain text in IndexedDB would leave it readable
    on the device. The plan never does that.
  </p>
  <ul class="col gap-2">
    <li>
      By default the password lives in memory for the session, and the app asks again next time.
    </li>
    <li>
      "Remember on this device" is a separate choice. The password is then stored encrypted with
      AES-GCM, using a non-extractable WebCrypto key kept in IndexedDB. That protects the data at
      rest. The app itself can still decrypt it, as any Basic-auth client must.
    </li>
    <li>
      The setup I recommend avoids the question: the proxy in front of the server adds the
      credentials, so the app holds none. On a tailnet the server's own password can be off.
    </li>
  </ul>
</DocsSection>
