<script lang="ts">
  import Diagram from '$lib/ui/components/Diagram.svelte';
  import Figure from '$lib/ui/components/Figure.svelte';
  import StepItem from '$lib/ui/components/StepItem.svelte';
  import StepList from '$lib/ui/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { RECOGNIZER_FOR } from '../ocr/ocr-snippets';
  import { CATALOG_SOURCE, REQUEST_PATH } from './architecture-diagrams';
  import { ARCHITECTURE_SECTIONS, OCR_PORT_HREF, architectureHref } from './architecture-sections';
  import {
    BRAND,
    CATALOG_PROTOCOLS_LIST,
    CATALOG_SOURCE_FOR,
    CATALOG_SOURCE_PORT,
    FEED_SEARCH,
    LOAD_MANGA_OCR,
    QUERY_CLIENT,
    READ_STATE,
    RENAME_METHOD,
    RENAME_MUTATION,
    RENAME_TEXTS,
    SEARCH_ADDRESS,
    STORAGE_DATA,
    STORAGE_QUERY,
    TAG_ADAPTER,
    UNCHANGEABLE_TEXT,
    VIEW_MODEL_SPEC,
    WORKER_BOUNDARY,
  } from './architecture-snippets';
  import RenameDemo from './RenameDemo.svelte';

  const OPDS2_SKETCH = `const CATALOG_PROTOCOLS = ['opds1', 'opds2'] as const;

const loading = match(protocol)
  .with('opds1', () => loadOpds1Source())
  .with('opds2', () => loadOpds2Source())
  .exhaustive()

adapters/opds2/opds2-catalog-source.ts
  class Opds2CatalogSource implements CatalogSource
    readFeed: fetch the text with HttpCatalogClient.readText,
              JSON.parse it, build a FeedPage
    search, readImage, download: the same four methods`;
</script>

<DocsSection title={ARCHITECTURE_SECTIONS.rehearsal}>
  <p>
    Dokseo's Manage tags screen, at <code>/tags/manage</code>, renames a tag. Behind it is the
    <code>renameTag</code> use case from
    <a href={architectureHref('useCases')}>One use case per operation</a>, with three named outcomes
    and one way to throw. The demo runs that use case, imported from the recognition domain, against
    a fake <code>TagRepository</code> whose behavior you choose, then shows the code in the screen's view
    model that handles what came back.
  </p>
  <RenameDemo />
  <p>The texts the arms show are constants in the same file:</p>
  <DocsCode label={RENAME_TEXTS.label} code={RENAME_TEXTS.code} />
  <DocsCode label={UNCHANGEABLE_TEXT.label} code={UNCHANGEABLE_TEXT.code} />
</DocsSection>

<DocsSection title={ARCHITECTURE_SECTIONS.path}>
  <p>
    The same rename, followed through every layer of the real app, from the press on Save to the row
    in IndexedDB.
  </p>
  <Figure>
    <Diagram {...REQUEST_PATH} />
    {#snippet caption()}
      A rename on the way down. Arrows here are calls, not imports: the adapter imports the port,
      while the call runs from the use case through the port into the adapter. The highlighted pair
      is the inner ring.
    {/snippet}
  </Figure>
  <StepList>
    <StepItem title="The screen calls the view model">
      <p>
        Save submits the rename form, and <code>ManageTagsScreen.svelte</code>'s submit handler
        calls
        <code>manage.rename(tag, editing.draft)</code>, where <code>editing</code> holds the draft
        text. The route built <code>manage</code> as a
        <code>ManageTags</code> with <code>container.recognition</code>.
      </p>
    </StepItem>
    <StepItem title="The view model runs a mutation">
      <p>
        <code>rename</code> checks the name it is given first. A blank name stops here, with "A tag
        needs a name." Otherwise it runs the rename mutation, built from the factory in
        <code>queries/</code>:
      </p>
      <DocsCode label={RENAME_MUTATION.label} code={RENAME_MUTATION.code} />
    </StepItem>
    <StepItem title="The container runs the use case">
      <p>
        <code>recognition.renameTag</code> is the closure the builder made, which calls
        <code>renameTag(&#123; tags &#125;, tag, name)</code> with the IndexedDB adapter.
      </p>
    </StepItem>
    <StepItem title="The use case calls the port, and the adapter reads the store">
      <p>
        <code>renameTag</code> lists the tags, looks for a clash, and saves. The adapter turns each
        call into a transaction on the <code>tags</code> store of the <code>recognition</code>
        database, and returns <code>storage-unavailable</code> when <code>indexedDB</code> is undefined.
      </p>
      <DocsCode label={TAG_ADAPTER.label} code={TAG_ADAPTER.code} />
    </StepItem>
    <StepItem title="The answer comes back up">
      <p>
        The union resolves through the mutation. On <code>success</code> the view model's
        <code>onSuccess</code> invalidates the tag list and every capture, so each screen showing a
        tag name reads it again. Then <code>rename</code> matches the union:
      </p>
      <DocsCode label={RENAME_METHOD.label} code={RENAME_METHOD.code} />
    </StepItem>
    <StepItem title="A throw takes the other channel">
      <p>
        If IndexedDB throws, nothing resolves. The mutation's <code>onError</code> shows "Could not
        rename that tag" with the cause and logs it, and <code>rename</code> catches the rejection
        to
        <code>null</code> and stops. The generation counter drops an answer that arrives after a newer
        rename started.
      </p>
    </StepItem>
  </StepList>
</DocsSection>

<DocsSection title={ARCHITECTURE_SECTIONS.queries}>
  <p>
    Every read in Dokseo is a TanStack Query query and every write a mutation, all through one
    client:
  </p>
  <DocsCode label={QUERY_CLIENT.label} code={QUERY_CLIENT.code} />
  <p>
    Retries are off, and so is refetching when the window regains focus or the network returns. And
    <code>networkMode: 'always'</code> keeps every read and write running offline, where TanStack's
    default of <code>'online'</code> would pause them.
  </p>
  <p>
    A domain's <code>queries/</code> folder holds the factories. A factory takes the use cases it
    calls as a parameter, typed by what it calls rather than as the whole container, so a test hands
    it a plain object. <code>queries-call-use-cases-they-are-handed</code> forbids importing the use case
    instead.
  </p>
  <DocsCode label={STORAGE_QUERY.label} code={STORAGE_QUERY.code} />
  <p>
    A read belongs to a <em>data component</em>, a <code>&lt;Thing&gt;Data.svelte</code> file that
    starts the query, draws the loading and failed states, and renders its children with the value.
    The only door to TanStack's <code>createQuery</code> is <code>readQuery</code> in
    <code>shared/</code>, which maps the library's status flags to one union:
  </p>
  <DocsCode label={READ_STATE.label} code={READ_STATE.code} />
  <DocsCode label={STORAGE_DATA.label} code={STORAGE_DATA.code} />
  <p>
    A write goes through <code>writeQuery</code>, the matching door to <code>createMutation</code>,
    owned by a view model like <code>ManageTags</code> above. No view model holds a read: the cache holds
    the data, and a view model holds only what the cache must not, such as an open book or a worker session.
  </p>
</DocsSection>

<DocsSection title={ARCHITECTURE_SECTIONS.languages}>
  <p>
    A book records its language, and each language needs its own OCR model: manga-ocr for Japanese,
    PaddleOCR for Korean. The use cases that read text receive a <code>TextRecognizer</code> and
    never branch on the language; the composition root picks the adapter. In
    <code>composition/recognizers.ts</code>, <code>recognizerFor</code> reads the engine settings for
    the language, finds the chosen model, and matches on the model's runtime:
  </p>
  <DocsCode label={RECOGNIZER_FOR.label} code={RECOGNIZER_FOR.code} />
  <p>
    Each runtime's adapter loads through a dynamic <code>import()</code>, so a bundler splits the
    OCR code into its own chunk, fetched the first time a book needs it rather than with the library
    screen:
  </p>
  <DocsCode label={LOAD_MANGA_OCR.label} code={LOAD_MANGA_OCR.code} />
  <p>
    Only the recognizer varies by language today; no type groups it with other per-language parts. A
    new runtime added to <code>ModelRuntime</code> breaks the <code>.exhaustive()</code> above until
    it gets an adapter. One failure mode has no check: a refactor that turns the dynamic import into
    a static one still compiles and passes every rule, and only the bundle grows. The OCR page
    covers
    <a href={OCR_PORT_HREF}>the port and both adapters</a>.
  </p>
</DocsSection>

<DocsSection title={ARCHITECTURE_SECTIONS.catalogs}>
  <p>
    Dokseo can list and download books from a catalog, a server such as Calibre that publishes its
    books as feeds. The one format it reads today is OPDS 1.x, an Atom XML format. Only one folder
    of the catalog domain, <code>adapters/opds1/</code>, knows that. Everything above it uses a port
    named for the need, <code>CatalogSource</code>: read a feed, search, read an image, download a
    file.
  </p>
  <DocsCode label={CATALOG_SOURCE_PORT.label} code={CATALOG_SOURCE_PORT.code} />
  <p>
    A feed comes back already parsed, as a <code>FeedPage</code> in the domain: either a navigation
    page, a list of links to other feeds, or an acquisition page, a list of publications. The two
    are separate types in a union on <code>kind</code>, so a navigation page cannot hold a
    publication. A page also has the address of the next one, which is how a long feed is read a
    page at a time. A response that is not a catalog at all returns <code>not-a-catalog</code>, and
    the network failures are named variants of the same union. The use cases and the browse screen
    handle no XML, no OPDS link relations and no URL templates.
  </p>
  <p>
    Search shows how far that goes. OPDS 1 describes search as a URL template with a
    <code>&#123;searchTerms&#125;</code> placeholder. A feed that supports search carries a
    <code>FeedSearch</code>, and the port's <code>search</code> takes that value with the query:
  </p>
  <DocsCode label={FEED_SEARCH.label} code={FEED_SEARCH.code} />
  <p>
    The use cases and the screen test it for <code>null</code>, to decide whether to show a search
    field, and pass it back with the text. For OPDS 1 the handle is the template, and only the
    adapter fills it in:
  </p>
  <DocsCode label={SEARCH_ADDRESS.label} code={SEARCH_ADDRESS.code} />
  <Figure>
    <Diagram {...CATALOG_SOURCE} />
    {#snippet caption()}
      One port, one adapter. The arrows are imports. The box marked not built is a place a second
      adapter would go, and nothing in the code names it yet.
    {/snippet}
  </Figure>
  <p>
    Each catalog records the protocol it speaks, so the adapter follows the catalog and not a global
    setting. The protocols are a union, and the composition root picks the adapter with the same
    pattern as <a href={architectureHref('languages')}>the recognizers</a>:
  </p>
  <DocsCode label={CATALOG_PROTOCOLS_LIST.label} code={CATALOG_PROTOCOLS_LIST.code} />
  <DocsCode label={CATALOG_SOURCE_FOR.label} code={CATALOG_SOURCE_FOR.code} />
  <p>
    <code>catalogSourceFor</code> loads the adapter and the HTTP client it uses through a dynamic
    <code>import()</code> the first time a catalog of that protocol is used, and holds the promise
    so each adapter is built once. A failed load is dropped, so the next call tries again. The use
    cases receive this function as <code>sourceFor</code> in their dependencies and never import an adapter.
  </p>
  <p>
    The <code>match(...).exhaustive()</code> is what makes a new protocol visible. Adding a member
    to <code>CATALOG_PROTOCOLS</code> makes this <code>match</code> fail to compile until it has an
    arm for the new protocol. The same holds for the other <code>match</code> over
    <code>CatalogProtocol</code>, the one in the catalog screens' texts that words the "not a
    catalog" message. Nothing is left to find by running the app.
  </p>
  <p>
    No second protocol exists. This sketch, which is not code from the repository, shows where an
    OPDS 2.0 adapter, a JSON format, would go: one more protocol, one more arm, and one more adapter
    folder that reuses the HTTP client and parses JSON into the same <code>FeedPage</code>.
  </p>
  <DocsCode label="Sketch, not real code: a JSON adapter" code={OPDS2_SKETCH} />
  <p>
    The use cases, the view models and the screens would not change, because the port returns the
    same <code>FeedPage</code> whichever format the server speaks.
  </p>
</DocsSection>

<DocsSection title={ARCHITECTURE_SECTIONS.viewModels}>
  <p>
    Svelte 5 runes (<code>$state</code>, <code>$derived</code>) work in any
    <code>.svelte.ts</code> file, not only in components. So a class outside the component tree can hold
    reactive state, and a component reads it through getters. Dokseo puts any logic worth a test in such
    a view model, and the reason is testing, not tidiness.
  </p>
  <p>
    A <code>.svelte.ts</code> file compiles in a plain Node test. The same logic inside a
    <code>.svelte</code> component can only be reached by mounting the component in a browser test, and
    Dokseo writes browser tests only for a bug that has already appeared and that no unit test can reach.
    So logic left in a component is logic without a test. The rename rule above is tested in Node:
  </p>
  <DocsCode label={VIEW_MODEL_SPEC.label} code={VIEW_MODEL_SPEC.code} />
  <p>
    Two details follow from running outside a component. A view model's reactive values reach the
    component through getters, because destructuring one copies the value once. And
    <code>$effect</code> needs an owner outside a component, which <code>$effect.root()</code>
    provides, so view models use it rarely.
  </p>
</DocsSection>

<DocsSection title={ARCHITECTURE_SECTIONS.casts}>
  <p>
    A TypeScript <code>as</code> cast makes the compiler stop checking a claim. If the claim is
    wrong, nothing reports it until the code runs. Application code in Dokseo has no
    <code>as</code> casts (<code>as const</code> is a different thing and is fine). A value is built
    so its type follows, or narrowed with a real runtime check such as <code>instanceof</code>,
    <code>typeof</code>, <code>in</code> or a discriminant.
  </p>
  <p>Two places use an assertion because nothing else works:</p>
  <StepList>
    <StepItem title="A brand">
      <p>
        A <code>BookId</code> is a string with a type-only marker, so a page number or a tag id cannot
        be passed where a book id belongs. TypeScript has no way to produce such a value except an assertion,
        so each brand has one small function that makes it, and no call site casts.
      </p>
      <DocsCode label={BRAND.label} code={BRAND.code} />
    </StepItem>
    <StepItem title="A library boundary with missing or wrong types">
      <p>
        A worker's <code>self</code>, ONNX Runtime's sessions and its output tensors have types that
        do not match what the code receives. The assertion sits in one named function in the file
        that owns the boundary, and everything past it has a correct type.
      </p>
      <DocsCode label={WORKER_BOUNDARY.label} code={WORKER_BOUNDARY.code} />
    </StepItem>
  </StepList>
  <p>
    Unlike the import rules, no tool enforces this one: the linter configuration has no rule against
    type assertions, so it holds by review.
  </p>
</DocsSection>

<DocsSection title={ARCHITECTURE_SECTIONS.limits}>
  <p>
    A path rule protects only the paths it matches. Each of these imports passes
    <code>npm run lint:deps</code> today (checked with the checker above), and only convention governs
    it:
  </p>
  <ul>
    <li>
      A worker in <code>src/workers/</code> importing a use case. Workers match only the
      <code>^src/</code> catch-all of <code>only-the-container-builds-adapters</code>, so they are
      kept from adapters and nothing else.
    </li>
    <li>
      A <code>domain/</code> file importing <code>platform/</code>. The browser-free inner ring is a
      convention.
    </li>
    <li>
      A domain's <code>use-cases/</code> importing its own <code>ui/</code>.
      <code>cross-domain-contract-only</code>
      exempts a domain's own folders, and no other rule covers this pair.
    </li>
    <li>
      A domain importing upward, into <code>src/routes/</code>, <code>container.ts</code> or
      <code>composition/</code>. Only <code>queries/</code> is kept from the composition root, which
      is why the map above marks those boxes as allowed for other folders. View models use one such
      edge on purpose, <code>import type &#123; Container &#125;</code>, to name the container's
      type.
    </li>
    <li>A barrel, as <a href={architectureHref('barrels')}>No barrel files</a> shows.</li>
    <li>
      Domain knowledge in a file outside <code>src/lib/domains/</code>. The domain rules key off
      that prefix, so a decoder left in <code>src/workers/</code> breaks nothing. Dokseo keeps such code
      in a domain even when only a worker calls it.
    </li>
  </ul>
</DocsSection>

<DocsSection title={ARCHITECTURE_SECTIONS.rule}>
  <ul>
    <li>
      Put each operation in its own use case under <code>use-cases/</code>, taking its ports in a
      <code>deps</code> object and returning its own union. Expected outcomes resolve as variants; anything
      unplanned throws.
    </li>
    <li>
      Declare a new need as a port in <code>domain/</code>, implement it in <code>adapters/</code>,
      and create the adapter only in <code>container.ts</code> or <code>composition/</code>.
    </li>
    <li>Match any union of three or more variants with <code>match(...).exhaustive()</code>.</li>
    <li>
      Keep logic worth a test in a <code>.svelte.ts</code> view model, reads in a data component, and
      writes in a mutation.
    </li>
    <li>
      When a screen needs two domains, compose them in the route with a snippet. A new domain is a
      non-leaf until its name is added to <code>LEAF_DOMAINS</code>.
    </li>
    <li>No barrel files, and no <code>as</code> casts outside brands and library boundaries.</li>
    <li>
      Prove a new or changed rule: write the forbidden import, run
      <code>npm run lint:deps</code>, read the rule's name in the failure, and delete the import.
    </li>
  </ul>
</DocsSection>
