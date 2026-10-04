<script lang="ts">
  import Diagram from '$lib/components/Diagram.svelte';
  import Figure from '$lib/components/Figure.svelte';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import { PATH_RULES, UNPORTED_RULES } from '../../../domain/import-rules';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { DOMAIN_GRAPH, LAYERS } from './architecture-diagrams';
  import {
    ARCHITECTURE_SECTIONS,
    EPUB_FLOWING_HREF,
    IMPORT_PLAN_HREF,
    OCR_PORT_HREF,
    STORAGE_ACCOUNT_HREF,
    STORAGE_DATABASES_HREF,
    UI_DIRECTION_HREF,
    architectureHref,
  } from './architecture-sections';
  import {
    BUILD_CONTAINER,
    BUILD_TAGS,
    LEAF_LIST,
    LEAF_RULE,
    MANAGE_ROUTE,
    USE_CONTAINER,
  } from './architecture-snippets';
  import ImportCheckDemo from './ImportCheckDemo.svelte';
  import ImportMapDemo from './ImportMapDemo.svelte';
  import { ruleNote } from './rule-notes';

  const DOMAIN_PARTS = [
    {
      folder: 'domain/',
      holds: 'Ports, entities, value objects and pure rules, in plain TypeScript with no runes',
      rule: 'domain-ring-is-pure',
    },
    {
      folder: 'use-cases/',
      holds: 'One stateless operation per file, returning its own named union',
      rule: 'cross-domain-contract-only',
    },
    {
      folder: 'adapters/',
      holds: 'The implementation of each port: IndexedDB, OPFS, pdf.js, the OCR workers',
      rule: 'only-the-container-builds-adapters',
    },
    {
      folder: 'queries/',
      holds: 'Query keys and the factories that return query and mutation options',
      rule: 'queries-call-use-cases-they-are-handed',
    },
    {
      folder: 'ui/',
      holds: 'Svelte components, data components and view models',
      rule: 'routes-are-thin',
    },
  ] as const;

  const RULE_NAMES = [...PATH_RULES.map((rule) => rule.name), ...UNPORTED_RULES];
</script>

<DocsSection title={ARCHITECTURE_SECTIONS.tree}>
  <p>
    Dokseo is a reader for manga and books that runs entirely in the browser: a static SvelteKit app
    with no server code. Everything under <code>src/</code> belongs to one layer, and an import may only
    point down this picture.
  </p>
  <Figure>
    <Diagram {...LAYERS} />
    {#snippet caption()}
      Dokseo's layers. The highlighted pair is the inner ring of each domain. Every arrow is an
      import that the rules allow, and an arrow drawn the other way would fail the build.
    {/snippet}
  </Figure>
  <p>
    The five boxes from <code>ui/</code> down to <code>domain/</code> repeat inside every domain
    folder. Below them, <code>shared/</code> is the kernel: branded ids, geometry, and the few
    contracts two domains both use, such as the <code>PageSource</code> port that the library
    produces and both the image reader and the recognizer consume. <code>platform/</code> holds browser
    capability with no domain words in it, such as the IndexedDB connection handling every database shares.
    No rule orders those two against each other; both may import the other, as long as no file cycle forms.
  </p>
  <p>
    <code>src/lib/components/</code>, the base UI library, sits below <code>shared/</code>: it
    imports nothing in <code>src/lib</code> but its siblings and <code>assets/</code>. The UI
    library page explains why, in <a href={UI_DIRECTION_HREF}>Dependency direction</a>. The worker
    entry points live in <code>src/workers/</code>, outside <code>src/lib</code>.
  </p>
</DocsSection>

<DocsSection title={ARCHITECTURE_SECTIONS.container}>
  <p>
    Dokseo's composition root is <code>src/lib/container.ts</code> with one builder per domain in
    <code>src/lib/composition/</code>. <code>buildContainer</code> creates the two repositories that
    more than one group needs, calls each builder, and returns the <code>Container</code>: a group
    of use cases per domain.
  </p>
  <DocsCode label={BUILD_CONTAINER.label} code={BUILD_CONTAINER.code} />
  <p>
    A builder creates the adapters only its domain uses and binds each use case to its deps, so the
    caller of <code>renameTag</code> passes a tag and a name and never sees the repository:
  </p>
  <DocsCode label={BUILD_TAGS.label} code={BUILD_TAGS.code} />
  <p>
    Every member of <code>Container</code> is a use case apart from <code>beginTrace</code>, a trace
    factory from <code>platform/</code>. No member is a port, so code that holds the container has
    no way to call a repository: the type has nothing to call.
  </p>
  <p>
    The root layout, <code>src/routes/+layout.svelte</code>, runs
    <code>provideContainer(buildContainer())</code> once, which puts the container in Svelte
    context.
    <code>src/lib/context.ts</code> reads it back out:
  </p>
  <DocsCode label={USE_CONTAINER.label} code={USE_CONTAINER.code} />
  <p>A route takes the container and passes the group it needs to the view model it builds:</p>
  <DocsCode label={MANAGE_ROUTE.label} code={MANAGE_ROUTE.code} />
</DocsSection>

<DocsSection title={ARCHITECTURE_SECTIONS.parts}>
  <p>
    A domain is a folder under <code>src/lib/domains/</code> with up to five parts. Each holds one kind
    of code, and each is named in at least one rule.
  </p>
  <Table size="sm">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Folder</TableHeaderCell>
        <TableHeaderCell>Holds</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each DOMAIN_PARTS as part (part.folder)}
        <TableRow>
          <TableCell><code>{part.folder}</code></TableCell>
          <TableCell>
            <div class="col gap-1">
              <span>{part.holds}</span>
              <span class="text-xs text-muted">named in <code>{part.rule}</code></span>
            </div>
          </TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    A domain has only the folders it needs. <code>viewing</code>, the image reader, stores nothing,
    so it has <code>domain/</code>, <code>queries/</code> and <code>ui/</code> and no adapters.
    <code>recognition</code> splits each folder again by theme (<code>capture/</code>,
    <code>engine/</code>, <code>model/</code>, <code>tag/</code>); the rules apply to the layer
    folders, and the themes are for reading. The port and adapter pairs are named for the need and
    for the technology: the OCR page walks through
    <a href={OCR_PORT_HREF}>the recognizer port and its adapters</a>, and the storage page lists
    <a href={STORAGE_DATABASES_HREF}>the database each domain's adapter opens</a>.
  </p>
</DocsSection>

<DocsSection title={ARCHITECTURE_SECTIONS.graph}>
  <p>
    Dokseo has six domains. Four are leaves, named once at the top of
    <code>.dependency-cruiser.cjs</code>:
  </p>
  <DocsCode label={LEAF_LIST.label} code={LEAF_LIST.code} />
  <p>
    <code>leaf-domains-are-independent</code> forbids a file in a leaf any import under
    <code>src/lib/domains/</code> outside its own domain, which is what <code>$1</code> means here:
  </p>
  <DocsCode label={LEAF_RULE.label} code={LEAF_RULE.code} />
  <p>
    Any domain folder not in the list is a non-leaf, and <code>non-leaves-import-only-leaves</code>
    lets it import its own folders and the leaves, nothing else.
    <code>storage</code> reports what the origin holds and owns operations that span two leaves:
    removing a book with its captures composes the library's <code>removeBook</code> and
    recognition's
    <code>clearCaptures</code>, and an import of captures is planned and written there too (see
    <a href={IMPORT_PLAN_HREF}>Planning an import</a>). <code>docs</code> holds these pages and is
    the exception to every rule: it may import any module, adapters and the container included, and
    <code>nothing-imports-docs</code> forbids every module outside it and
    <code>src/routes/docs/</code> from importing it.
  </p>
  <Figure>
    <Diagram {...DOMAIN_GRAPH} />
    {#snippet caption()}
      The domain imports that exist today, apart from <code>docs</code>, which may import every
      domain and is imported by none. No arrow leaves a leaf and none ends at a non-leaf, so no path
      can return to where it started.
    {/snippet}
  </Figure>
  <p>
    Two non-leaves cannot import each other either. When a screen needs two domains, the route
    composes them and passes one into the other as a snippet: the read route composes the readers
    with the capture panel, as the EPUB page describes for
    <a href={EPUB_FLOWING_HREF}>the flowing domain</a>. The docs pages need no such route, because
    <code>docs</code> imports the storage domain's components directly to show the real storage
    account; see <a href={STORAGE_ACCOUNT_HREF}>The storage account</a>.
  </p>
  <ImportMapDemo />
</DocsSection>

<DocsSection title={ARCHITECTURE_SECTIONS.rules}>
  <p>
    <code>.dependency-cruiser.cjs</code> holds {RULE_NAMES.length} forbidden rules, each with its reason
    in a <code>comment</code>. <code>deno task lint:deps</code> runs
    <code>depcruise src --config .dependency-cruiser.cjs</code>, and
    <code>deno task verify:static</code> runs it with the type check, the linter and the format check,
    so an import that breaks a rule fails the same command as a type error.
  </p>
  <Table size="sm">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Rule</TableHeaderCell>
        <TableHeaderCell>What it enforces</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each RULE_NAMES as name (name)}
        <TableRow>
          <TableCell><code>{name}</code></TableCell>
          <TableCell>{ruleNote(name)}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    The domain rules overlap on purpose. <code>cross-domain-contract-only</code> lets any domain
    import another's <code>domain/</code> and <code>use-cases/</code>, which on its own permits
    library to import recognition and recognition to import library at once. The two leaf rules
    close that gap, and <code>the-base-layers-know-no-domain</code> closes the indirect version,
    library to <code>shared/</code> to recognition.
  </p>
  <ImportCheckDemo />
</DocsSection>

<DocsSection title={ARCHITECTURE_SECTIONS.barrels}>
  <p>
    Dokseo has no <code>index.ts</code> that re-exports a folder, and none may be added. The checker
    above shows why with two presets. A route may import a domain's <code>ui/</code>, so
    <code>src/routes/+page.svelte</code> importing <code>library/ui/index.ts</code> passes. Inside
    the domain, <code>ui/</code> may import its own <code>use-cases/</code>, so the barrel
    re-exporting <code>open-file.ts</code> passes too. Yet the route importing
    <code>open-file.ts</code> directly is forbidden by <code>routes-are-thin</code>.
  </p>
  <p>
    Each edge is legal, and the route ends up calling a use case. dependency-cruiser checks files,
    not the names a file takes from a barrel, so no path rule can close this; only the absence of
    barrels does. An adapter is the one thing a barrel could not leak today, because the barrel's
    own import of it already breaks <code>only-the-container-builds-adapters</code>, whose
    <code>from</code> pattern ends in a catch-all <code>^src/</code>. The ban applies to icons too,
    through <code>icons-are-imported-one-by-one</code>.
    <a href={architectureHref('limits')}>What the rules do not reach</a> lists the imports no rule covers.
  </p>
</DocsSection>
