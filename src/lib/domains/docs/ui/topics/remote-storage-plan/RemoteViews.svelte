<script lang="ts">
  import Diagram from '$lib/ui/components/Diagram.svelte';
  import Figure from '$lib/ui/components/Figure.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { VIEWS } from './remote-diagrams';
  import { REMOTE_SECTIONS } from './remote-sections';
  import {
    FEED_CACHE_TIMES,
    FEED_PAGE_TYPE,
    PAGED_FEED_READ,
    SEARCH_DEBOUNCE,
  } from './remote-snippets';
</script>

<DocsSection title={REMOTE_SECTIONS.views}>
  <p>
    The library shows a tab bar once at least one catalog exists: "On this device" first, then one
    tab per catalog, named as the reader named it. With no catalog the library has no tabs and looks
    as it did before catalogs existed. "On this device" lists every held book, downloaded ones
    included. A book from a catalog shows a badge with the catalog's name, and a "Source" filter
    narrows the list to "All", "Added from files" or "Downloaded from" one catalog. A catalog tab
    lists the catalog's entries as <code>RemoteItem</code> values.
  </p>
  <Figure>
    <Diagram {...VIEWS} />
    {#snippet caption()}
      The two kinds of tab. A remote item moves to downloading when the reader asks for the book,
      and ends as held or as download-failed.
    {/snippet}
  </Figure>
  <p>
    The selected tab and the place inside each catalog are session state, kept in memory while
    Dokseo is open. The breadcrumbs above a catalog are its history: opening a feed adds one browser
    history entry, a click on a crumb goes back to that crumb's entry, and Back goes up one feed.
    Each entry keeps its own scroll position and selection. Going to read a book and coming back
    shows the same place, and so does a link to the library, such as the reader's "Back to your
    library": each tab appears at the place it was left. A crumb whose entry is not in the history
    of that visit opens its feed as a new entry, so Back returns to the deeper feed. None of this is
    in the URL, because a catalog's id is a random id local to the device and a URL never holds one,
    and none of it is stored, because a saved position would open a feed the server has since moved.
    A selected tab whose catalog was removed falls back to "On this device".
  </p>
  <p>
    Feeds are cached in memory. A feed read within the last five minutes is shown without a request,
    and an entry stays cached for 30 minutes after it was last shown. Offline, a feed that is not in
    the cache says it needs a connection. Nothing from a listing is stored, because stored catalog
    data would drift from the server's. The only stored remote data is the origin record of each
    downloaded book. Removing a downloaded book deletes its origin, so its entry shows as remote
    again. Removing a catalog deletes its origins and keeps the books, which then count as "Added
    from files".
  </p>
  <DocsCode label={FEED_CACHE_TIMES.label} code={FEED_CACHE_TIMES.code} />
  <p>
    A feed scrolls endlessly. Below the grid a sentinel row loads the next page when it comes within
    600 px of the end of the scrolling area, and a "Load more" button in the same row reaches it
    from the keyboard. A page that fails shows its error and "Try again", and never retries by
    itself. An entry that a later page repeats is listed once, because Calibre pages by offset over
    a library that can change.
  </p>
  <p>
    Each feed is read through <code>readPagedQuery</code>, a small wrapper over TanStack Query's
    <code>createInfiniteQuery</code>. It takes the query options and a page type and has no catalog
    code. The cache holds the parsed <code>FeedPage</code> of every page loaded so far, and the
    cursor for the next page is the last page's own <code>next</code>, a <code>FeedAddress</code>:
    the sentinel row and the "Load more" button ask for the page at that address.
  </p>
  <DocsCode label={FEED_PAGE_TYPE.label} code={FEED_PAGE_TYPE.code} />
  <DocsCode label={PAGED_FEED_READ.label} code={PAGED_FEED_READ.code} />
  <p>
    A click on a card opens that entry's details in a modal (a bottom sheet on a narrow screen):
    cover, summary, authors, language, format, size and the date it was updated, leaving out what
    the entry lacks, with the card's actions. A summary keeps the line breaks of the feed, one
    paragraph per line. The click targets the cover, which is one button, and the title beside it is
    plain text. A click on a book under "On this device" opens its details in the same way, and the
    details name its source.
  </p>
  <p>
    Selection is the checkbox on a card's cover. A card is selectable while it is <code>remote</code
    >
    or <code>download-failed</code>. A bar above the grid offers "Select all" (every loaded
    selectable entry), "Clear" and "Download selected (n)". The queue runs one file at a time in
    feed order and shows progress, and "Cancel all" aborts the running file and drops the rest. One
    failed file does not stop the queue, but a missing connection, a refused password, a locked
    catalog or unavailable storage does, because every later file would fail the same way. The
    selection belongs to one place in the catalog and is kept with it.
  </p>
</DocsSection>

<DocsSection title={REMOTE_SECTIONS.search}>
  <p>
    One field acts on what the reader sees. On "On this device" the library's header field filters
    titles at each keystroke. On a catalog tab the same field reads "Search" followed by the
    catalog's name, and sends the query to the server after a pause in typing, or at once on Enter.
  </p>
  <DocsCode label={SEARCH_DEBOUNCE.label} code={SEARCH_DEBOUNCE.code} />
  <p>
    A new search aborts the one still in flight, and a query equal to the one shown sends nothing.
    An empty field while a search is shown goes back to the feed the reader was on when the search
    began. A result opens as a feed whose path is the catalog root plus one "Search: query" step, so
    a second search replaces that step. A catalog whose feeds offer no search link disables the
    field and says so. Each tab keeps its own query.
  </p>
  <p>
    Where the header field is hidden, at the narrow app widths, a search field sits at the top of
    the catalog tab and does the same through the same code. The same width puts a title filter at
    the top of "On this device". The search popover on the keyboard shortcut keeps searching the
    books, tags and captures on the device only, because a result on a server cannot be opened
    without a download.
  </p>
</DocsSection>
