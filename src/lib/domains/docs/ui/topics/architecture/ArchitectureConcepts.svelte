<script lang="ts">
  import Diagram from '$lib/components/Diagram.svelte';
  import Figure from '$lib/components/Figure.svelte';
  import StepItem from '$lib/components/StepItem.svelte';
  import StepList from '$lib/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { DOMAIN_CYCLE, PORT_AND_ADAPTERS } from './architecture-diagrams';
  import { ARCHITECTURE_SECTIONS, architectureHref } from './architecture-sections';
  import { RENAME_RESULT, RENAME_USE_CASE, TAG_PORT } from './architecture-snippets';
  import MatchDemo from './MatchDemo.svelte';
</script>

<DocsSection title={ARCHITECTURE_SECTIONS.direction}>
  <p>
    When file A imports file B, A depends on B. A change to B can break A, and A cannot run, or be
    tested, without B coming along. In a small app nobody notices. In a larger one, imports that run
    in every direction mean that any change can break anything, and a test of one screen loads half
    the app.
  </p>
  <p>
    The fix is to sort the code into layers and let imports point one way only: from code that
    changes often and sits close to the screens, toward code that changes rarely and holds only the
    rules of the problem. A screen may import an operation; the operation may not import the screen.
    Code at the bottom then runs anywhere, including a plain Node test, because nothing it imports
    needs a browser.
  </p>
</DocsSection>

<DocsSection title={ARCHITECTURE_SECTIONS.ports}>
  <p>
    The layer rule raises a question straight away. An operation such as "rename a tag" has to read
    and write stored tags, and the store is IndexedDB, a browser API at the edge of the app. If the
    operation imports the IndexedDB code, the arrow points the wrong way: the rule of the problem
    now depends on the technology, it cannot run in Node, and changing the store means editing the
    operation.
  </p>
  <p>
    Ports and adapters, the pattern Alistair Cockburn also called hexagonal architecture, turns that
    arrow around. The inner code declares what it needs as an interface, named for the need, not the
    technology. That interface is a <em>port</em>. Code that implements the port with a real
    technology is an <em>adapter</em>. The operation imports the port; the adapter imports the port
    too, to implement it. Both arrows end at the inner code, and nothing inside names IndexedDB.
  </p>
  <DocsCode label={TAG_PORT.label} code={TAG_PORT.code} />
  <Figure>
    <Diagram {...PORT_AND_ADAPTERS} />
    {#snippet caption()}
      One port, two adapters. The arrows are imports. The fake in memory is the one the demo on this
      page runs.
    {/snippet}
  </Figure>
  <p>
    Cockburn's stated aim is an application that can be "developed and tested in isolation from its
    eventual run-time devices and databases". A test hands the operation an adapter that keeps tags
    in an array, and the operation runs the same either way, because it only ever calls
    <code>list</code> and <code>save</code>.
  </p>
</DocsSection>

<DocsSection title={ARCHITECTURE_SECTIONS.root}>
  <p>
    If nothing inside imports an adapter, something outside has to. That place is the
    <em>composition root</em>: one module, run once at startup, that creates each adapter and hands
    it to the code that needs its port. It is the only code that names the technology behind each
    port, so swapping a store, or choosing between two OCR engines, is an edit in one file.
  </p>
  <p>
    The root hands out finished operations, not adapters. Whatever receives the result can call an
    operation but has no port to reach for, so a screen cannot skip the operation and write to the
    store directly.
  </p>
</DocsSection>

<DocsSection title={ARCHITECTURE_SECTIONS.useCases}>
  <p>
    The operations themselves are <em>use cases</em>, and the convention here is one per operation,
    in its own file: rename a tag, read a book, save a capture. A use case is a function. It takes
    its ports in a <code>deps</code> object, plus the operation's arguments, and holds no state between
    calls.
  </p>
  <DocsCode label={RENAME_USE_CASE.label} code={RENAME_USE_CASE.code} />
  <p>
    Some use cases are a single port call, and they still get a file. The alternative, letting a
    screen call the port when the operation is trivial, puts port calls in many places, and the
    first time the operation grows a rule (renaming must not take a name another tag holds) every
    one of them has to change. With a use case per operation there is one place to add the rule and
    one function to test.
  </p>
</DocsSection>

<DocsSection title={ARCHITECTURE_SECTIONS.failures}>
  <p>
    Renaming a tag can go wrong in several ways, and they are not the same kind of wrong. Another
    tag may already hold the name: a person typed it, and the screen has to show it. The browser may
    block storage, as some private windows do: also a normal outcome, with its own message. Or the
    database may throw something nobody planned for, such as a broken connection.
  </p>
  <p>
    The first two are <em>expected</em>: a caller can do something meaningful with them. The third
    is <em>unexpected</em>: no caller can fix it. TypeScript does not list what a function throws,
    so an expected failure that throws is invisible in the signature, and nothing makes a caller
    handle it. So an expected failure goes in the return type, as a named variant beside the
    success:
  </p>
  <DocsCode label={RENAME_RESULT.label} code={RENAME_RESULT.code} />
  <p>
    Each use case returns its own union, discriminated on <code>kind</code>, and the success variant
    names what it holds (<code>tag</code>, not <code>value</code>). A common alternative is one
    generic <code>Result&lt;T, E&gt;</code> for every operation. It is uniform, but a caller checks
    an <code>ok</code> flag and then matches the error, and the type no longer lists one operation's outcomes
    in one place. Dokseo has no generic result type.
  </p>
  <p>
    An unexpected failure throws and travels to a boundary that reports it. In promise terms: a use
    case resolves whenever it produced an answer, even "that name is taken", and rejects only when
    it produced none. Retries, error screens and caches all attach to the rejection channel, so a
    resolved "not found" is never retried and never shown as a crash.
  </p>
</DocsSection>

<DocsSection title={ARCHITECTURE_SECTIONS.exhaustive}>
  <p>
    A named union is only half the protection. The caller also has to handle every variant, and keep
    handling every variant when someone adds one. A chain of <code>if</code>s does not do that: the
    last <code>else</code> receives whatever is new.
  </p>
  <p>
    <a href="https://github.com/gvergnaud/ts-pattern">ts-pattern</a>'s <code>match(value)</code>
    takes one <code>.with(pattern, handler)</code> per case, and <code>.exhaustive()</code> at the
    end compiles only when the patterns cover every member of the union. A missing case turns
    <code>.exhaustive()</code> into a type error, and at run time an unmatched value throws "Pattern matching
    error: no pattern matches value". Dokseo uses it for every union of three or more variants.
  </p>
  <MatchDemo />
  <p>
    The demo's widened union is not in the code; it shows what would happen if a name length limit
    were added to <code>renameTag</code>. The match in the real view model stops compiling until the
    new case gets an arm, which is the point: the decision about what a long name means is made
    once, on purpose, before the build passes.
  </p>
</DocsSection>

<DocsSection title={ARCHITECTURE_SECTIONS.domains}>
  <p>
    Layers sort code by how close it is to the screen. A second split sorts it by subject: the
    library of books, the image reader, the text recognizer. Each subject is a <em>domain</em>, a
    folder with its own layers inside. Domains still need each other now and then, and the rule for
    that is that the graph of which domain imports which must have no cycle.
  </p>
  <p>
    A cycle makes two domains one domain in practice: neither can be changed, tested or deleted
    without the other. The catch is that a cycle between domains need not be a cycle between files:
  </p>
  <Figure>
    <Diagram {...DOMAIN_CYCLE} />
    {#snippet caption()}
      Two file imports, neither part of a loop of files, and still each domain depends on the other.
    {/snippet}
  </Figure>
  <p>
    A check for circular imports between files passes this graph, because no file reaches itself. A
    domain cycle needs a rule of its own, stated in terms of folders. The simplest one that cannot
    produce a cycle: name some domains <em>leaves</em>, which import no other domain, and let every
    other domain import only leaves. Every domain edge then runs from a non-leaf to a leaf, and no
    edge ever leaves a leaf, so no path can come back.
  </p>
  <p>
    When a screen needs two leaves at once, say a reader with a panel of captures, neither leaf
    imports the other. The screen's route composes them: the reader exposes a slot, and the route
    fills it with the other domain's component. In Svelte 5 the slot is a snippet passed as a prop.
  </p>
</DocsSection>

<DocsSection title={ARCHITECTURE_SECTIONS.tools}>
  <p>
    Rules like these erode under review. An import that crosses a boundary is one line in a large
    diff, it compiles, the app works, and the reviewer has to remember which folder may import
    which. A tool that reads every import on every run checks all of them, every time.
  </p>
  <p>
    <a href="https://github.com/sverweij/dependency-cruiser">dependency-cruiser</a> builds the
    import graph of a project and checks it against rules written as regular expressions on file
    paths. A
    <code>forbidden</code> rule names a <code>from</code> pattern and a <code>to</code> pattern; any import
    from a matching file to a matching file is a violation, printed with the rule's name, and the command
    exits non-zero. Two details matter for the rules below:
  </p>
  <StepList>
    <StepItem title="Group matching">
      <p>
        A part of <code>from.path</code> in brackets can be used in <code>to</code> as
        <code>$1</code>. With <code>^src/lib/domains/([^/]+)/</code> as the <code>from</code> path,
        <code>$1</code> is the importing file's own domain, so one rule can say "any domain except your
        own".
      </p>
    </StepItem>
    <StepItem title="Dependency types">
      <p>
        Every import has types such as <code>local</code>, <code>npm</code> or
        <code>type-only</code> (an <code>import type</code>). <code>dependencyTypesNot</code> excludes
        imports of the listed types from a rule.
      </p>
    </StepItem>
  </StepList>
  <p>
    A path rule matches which file imports which, never which names cross. That is why barrel files,
    an <code>index.ts</code> that re-exports a folder's modules, undo it: once a screen imports the
    barrel, the rule matches an import of <code>index.ts</code>, and every name behind it is
    reachable, the forbidden ones included.
    <a href={architectureHref('barrels')}>No barrel files</a> shows the case in Dokseo's own rules.
  </p>
</DocsSection>

<DocsSection title={ARCHITECTURE_SECTIONS.cache}>
  <p>
    The last piece is how screens get data. A screen that calls a use case in its own code ends up
    holding the loading state, the failure, the result, and the job of reading it again after a
    write. Every screen does it slightly differently.
  </p>
  <p>
    <a href="https://tanstack.com/query">TanStack Query</a> was built for server data, but nothing
    in it requires a server. A <em>query</em> is a key and a function returning a promise; the
    library runs the function, caches the result under the key, and reports the state. A
    <em>mutation</em>
    is a write. After a write, invalidating a key makes every query under it read again.
  </p>
  <p>
    One default has to change for data that lives in the browser. Queries and mutations default to
    <code>networkMode: 'online'</code>, which pauses them while the library's online manager reports
    the browser offline; that manager listens to the window's <code>online</code> and
    <code>offline</code> events. A read from IndexedDB needs no network, so under the default an
    offline reader would see the library stuck on loading. <code>networkMode: 'always'</code> runs them
    regardless.
  </p>
</DocsSection>
