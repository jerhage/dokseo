<script lang="ts">
  import Diagram from '$lib/components/Diagram.svelte';
  import Figure from '$lib/components/Figure.svelte';
  import StepItem from '$lib/components/StepItem.svelte';
  import StepList from '$lib/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { RECOGNIZER_FOR } from '../ocr/ocr-snippets';
  import { REQUEST_PATH } from './architecture-diagrams';
  import { ARCHITECTURE_SECTIONS, OCR_PORT_HREF, architectureHref } from './architecture-sections';
  import {
    BRAND,
    LOAD_MANGA_OCR,
    QUERY_CLIENT,
    READ_STATE,
    RENAME_METHOD,
    RENAME_MUTATION,
    RENAME_TEXTS,
    STORAGE_DATA,
    STORAGE_QUERY,
    TAG_ADAPTER,
    UNCHANGEABLE_TEXT,
    VIEW_MODEL_SPEC,
    WORKER_BOUNDARY,
  } from './architecture-snippets';
  import RenameDemo from './RenameDemo.svelte';
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
        <code>manage.rename(tag)</code>. The route built <code>manage</code> as a
        <code>ManageTagsView</code> with <code>container.recognition</code>.
      </p>
    </StepItem>
    <StepItem title="The view model runs a mutation">
      <p>
        <code>rename</code> checks the draft first. A blank name stops here, with "A tag needs a
        name." Otherwise it runs the rename mutation, built from the factory in
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
    owned by a view model like <code>ManageTagsView</code> above. No view model holds a read: the cache
    holds the data, and a view model holds only what the cache must not, such as an open book or a worker
    session.
  </p>
</DocsSection>

<DocsSection title={ARCHITECTURE_SECTIONS.languages}>
  <p>
    A book carries its language, and each language needs its own OCR model: manga-ocr for Japanese,
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
    <code>deno task lint:deps</code> today (checked with the checker above), and only convention governs
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
      <code>deno task lint:deps</code>, read the rule's name in the failure, and delete the import.
    </li>
  </ul>
</DocsSection>
