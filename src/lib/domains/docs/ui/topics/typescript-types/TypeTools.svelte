<script lang="ts">
  import Diagram from '$lib/ui/components/Diagram.svelte';
  import Figure from '$lib/ui/components/Figure.svelte';
  import StepItem from '$lib/ui/components/StepItem.svelte';
  import StepList from '$lib/ui/components/StepList.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import BrandMintDemo from './BrandMintDemo.svelte';
  import CompiledComparison from './CompiledComparison.svelte';
  import {
    ALIASED_READONLY,
    ANNOTATED_TOKENS,
    ANY_ROW,
    BRANDED_IDS,
    CLAIMED_ROW,
    COMPARED_BRANDS,
    COVARIANT_SPACE,
    DERIVED_UNION,
    DOUBLE_ASSERTION,
    GENERIC_IDS,
    IMPOSSIBLE_ASSERTION,
    INDEX_ARITHMETIC,
    INVARIANT_SPACE,
    LIST_SATISFIES,
    PARSED_ROW,
    READONLY_LIST,
    SATISFIED_TOKENS,
    SHALLOW_READONLY,
    UNKNOWN_ROW,
  } from './tool-examples';
  import { PARSE_BOUNDARY } from './type-diagrams';
  import { ARCHITECTURE_CASTS_HREF, TYPE_SECTIONS, typeHref } from './type-sections';
</script>

<DocsSection title={TYPE_SECTIONS.brands}>
  <p>
    <a href={typeHref('structural')}>Structural typing</a> left a book id and a tag id as the same
    type, because both are strings. A <em>brand</em> makes them different by adding a member that
    exists only in the type. The usual form intersects the base type with an object holding one
    property under a <code>unique symbol</code> key, whose type is the brand's name:
  </p>
  <CompiledComparison
    label="Two brands over one string"
    items={[{ title: 'BookId and TagId', example: BRANDED_IDS }]}
  />
  <p>
    A <code>TagId</code>'s brand property has the type <code>"TagId"</code>, not
    <code>"BookId"</code>, so it no longer fits, and a bare string, which has no brand property at
    all, does not fit either. The symbol is declared with <code>declare const</code>, so it exists
    for the compiler only: nothing is emitted, and no value at run time ever has that property.
  </p>
  <p>
    That has a consequence. No ordinary expression produces a value of a branded type, because no
    real string has the symbol property. The way to make one is an assertion,
    <code>value as TagId</code>. The assertion is safe here for a specific reason: a brand adds no
    run time requirement, so the claim cannot be wrong about the value's contents. It can only be
    wrong about meaning, about whether this string really is a tag id. That judgment is made where
    the value is created, so the assertion goes in one small function per brand, a
    <em>constructor</em> such as <code>tagId(value)</code>, and nowhere else. Every other line takes
    a
    <code>TagId</code> it was given and never asserts.
  </p>
  <p>Comparing a book id with a tag id becomes an error too:</p>
  <CompiledComparison
    label="Comparing two brands"
    items={[{ title: 'book === tag', example: COMPARED_BRANDS }]}
  />
  <p>
    A brand also works on numbers, for units or kinds of index. Arithmetic on a branded number
    returns a plain <code>number</code>, because <code>+</code> is defined on numbers, so the result has
    to be minted again. That is usually what is wanted: the sum of an index and one is an index only if
    the code says so.
  </p>
  <CompiledComparison
    label="Arithmetic loses the brand"
    items={[{ title: 'shown + 1', example: INDEX_ARITHMETIC }]}
  />
  <BrandMintDemo />
</DocsSection>

<DocsSection title={TYPE_SECTIONS.variance}>
  <p>
    A brand with a type parameter has one more gap. Dokseo keeps rectangles in two coordinate
    spaces, screen pixels and image pixels, and brands a rectangle with its space:
    <code>Rect&lt;'screen'&gt;</code> and <code>Rect&lt;'image'&gt;</code>. A function that works in
    any one space is generic over it,
    <code>clampTo&lt;S&gt;(r: Rect&lt;S&gt;, bounds: Rect&lt;S&gt;)</code>, and should accept two
    rectangles only when they share a space.
  </p>
  <p>
    With the obvious brand, a property of type <code>S</code>, it does not. The compiler has to
    infer one <code>S</code> from two arguments; it infers the union
    <code>'screen' | 'image'</code>, and both rectangles fit
    <code>Rect&lt;'screen' | 'image'&gt;</code>, because a property typed
    <code>'screen'</code> is assignable to one typed <code>'screen' | 'image'</code>. That direction
    of fit is called <em>covariance</em>, and it is what lets the mix-up through:
  </p>
  <CompiledComparison
    label="A covariant brand and an invariant one"
    items={[
      {
        title: 'readonly [space]: S',
        example: COVARIANT_SPACE,
        missed:
          'A screen rectangle is clamped to an image rectangle, and the result is wrong at run time.',
      },
      { title: 'in out S, and a function', example: INVARIANT_SPACE },
    ]}
  />
  <p>
    The fix makes the parameter <em>invariant</em>: a <code>Rect&lt;A&gt;</code> fits a
    <code>Rect&lt;B&gt;</code> only when <code>A</code> and <code>B</code> are the same. A property
    whose type is a function from <code>S</code> to <code>S</code> uses <code>S</code> both as input
    and output, and the TypeScript 4.7 release notes give the rule:
    <q>When a T is used in both an output and input position, it becomes invariant.</q> The
    <code>in out</code> annotation, also from 4.7, states the same thing on the parameter. It is still
    purely a type: nothing is emitted.
  </p>
  <p>
    The same gap exists for any covariant brand passed to a function generic over the brand. Two
    differently branded ids pass a generic <code>sameId</code> the same way:
  </p>
  <CompiledComparison
    label="The gap with id brands"
    items={[
      {
        title: 'A function generic over the brand',
        example: GENERIC_IDS,
        missed: 'B is inferred as "BookId" | "TagId", and both arguments fit.',
      },
    ]}
  />
</DocsSection>

<DocsSection title={TYPE_SECTIONS.satisfies}>
  <p>
    An annotation such as <code>const tokens: Record&lt;DockDetent, string&gt;</code> checks the
    value, and then the variable has the annotated type, not the value's own. Every literal string
    in it is widened to <code>string</code>, so the specific values are lost to the code that reads
    them:
  </p>
  <CompiledComparison
    label="An annotation widens"
    items={[{ title: 'Annotated as Record', example: ANNOTATED_TOKENS }]}
  />
  <p>
    Two operators split the jobs. <code>as const</code>, from TypeScript 3.4, keeps literal types
    unwidened, makes object properties <code>readonly</code> and turns an array literal into a
    readonly tuple. It is written with <code>as</code>, but it asserts nothing: it narrows the type
    to exactly what the literal says. <code>satisfies</code>, from TypeScript 4.9, does the checking
    part alone. The release notes put it as checking
    <q
      >that the type of an expression matches some type, without changing the resulting type of that
      expression</q
    >. Together they keep the literal types and still fail when a key is missing:
  </p>
  <CompiledComparison
    label="as const satisfies"
    items={[{ title: 'A missing key', example: SATISFIED_TOKENS }]}
  />
  <p>
    Applied to a list, <code>satisfies readonly TagColour[]</code> checks that every entry is a
    color, and <code>as const</code> keeps the list a tuple, so its first entry has a known type
    even under
    <code>noUncheckedIndexedAccess</code>, which otherwise adds <code>undefined</code> to every
    index read. What neither checks is completeness: a list that leaves a color out still satisfies
    <code>readonly TagColour[]</code>.
  </p>
  <CompiledComparison
    label="A tuple and an array"
    items={[{ title: 'TAG_COLOURS[0] and ANNOTATED[0]', example: LIST_SATISFIES }]}
  />
  <p>
    Completeness stops being a question when the list comes first and the union is taken from it.
    <code>typeof TAG_COLOURS</code> is the readonly tuple <code>as const</code> produced, and
    indexing it with <code>[number]</code> gives the union of its entries. A color is in the type exactly
    when it is in the list, so a list that leaves a color out cannot exist: leaving it out of the list
    removes it from the type, and every use of it fails to compile.
  </p>
  <CompiledComparison
    label="A union taken from its list"
    items={[{ title: '(typeof TAG_COLOURS)[number]', example: DERIVED_UNION }]}
  />
</DocsSection>

<DocsSection title={TYPE_SECTIONS.readonly}>
  <p>
    <code>readonly</code> on a property stops that property from being reassigned. It does not reach
    into the value. The handbook is explicit:
    <q>It just means the property itself can't be re-written to.</q>
    A <code>readonly</code> property holding an ordinary array still allows <code>push</code>:
  </p>
  <CompiledComparison
    label="readonly on the property and on the array"
    items={[
      {
        title: 'readonly tagIds: string[]',
        example: SHALLOW_READONLY,
        missed: 'The capture is changed in place through a property marked readonly.',
      },
      { title: 'readonly tagIds: readonly string[]', example: READONLY_LIST },
    ]}
  />
  <p>
    Marking the array type <code>readonly</code> as well removes the mutating methods, and the only
    way to add a tag becomes building a new array, as <code>tagged</code> does. There is one more
    limit. TypeScript does not compare <code>readonly</code> when it checks whether two types fit, so
    a mutable alias can change what a readonly one shows:
  </p>
  <CompiledComparison
    label="Changed through an alias"
    items={[
      {
        title: 'A mutable and a readonly name',
        example: ALIASED_READONLY,
        missed: 'shown.index reads 13 afterwards, through a type that calls it readonly.',
      },
    ]}
  />
  <p>
    So <code>readonly</code> is a statement about one name, checked at compile time. It is still worth
    writing: it catches every change made through that name, and inside a function the parameter is usually
    the only name the function has.
  </p>
</DocsSection>

<DocsSection title={TYPE_SECTIONS.unknown}>
  <p>
    Some values enter a program with no type at all: text parsed from JSON, a row read from
    IndexedDB, a message from another thread. TypeScript has two types for them.
    <code>any</code> switches checking off: in the handbook's words,
    <q>Using any disables all further type checking</q>. <code>unknown</code>, added in TypeScript
    3.0, is the safe counterpart: anything can be assigned to it, and nothing can be done with it
    until a check narrows it.
    <code>JSON.parse</code> returns <code>any</code>, so the choice is made by annotating the
    result:
  </p>
  <CompiledComparison
    label="The same parse, two types"
    items={[
      {
        title: 'Left as any',
        example: ANY_ROW,
        missed: 'At run time row.title is 214, and trim throws a TypeError.',
      },
      { title: 'Annotated as unknown', example: UNKNOWN_ROW },
    ]}
  />
  <p>
    Annotating as <code>unknown</code> moves the check to where the value arrives. That place is the
    <em>boundary</em>: outside it, values are <code>unknown</code>; inside it, every value has a
    type that was checked once, field by field, and the rest of the program never checks again.
  </p>
  <Figure>
    <Diagram {...PARSE_BOUNDARY} />
    {#snippet caption()}
      Dokseo's boundaries for stored data. The checks run once, where a value enters.
    {/snippet}
  </Figure>
  <p>
    Parsing at the boundary means a series of narrowing checks, each followed by the code that
    relies on it. A guard for "an object with unknown fields" opens the value up, and each field is
    then checked on its own:
  </p>
  <CompiledComparison
    label="Field by field"
    items={[{ title: 'A title, checked', example: PARSED_ROW }]}
  />
  <p>
    Libraries such as Zod and Valibot run these checks against a schema written in code and return
    the parsed type. Dokseo writes them by hand with a few shared guards, which <a
      href={typeHref('rows')}>Stored rows are unknown until checked</a
    >
    shows.
  </p>
</DocsSection>

<DocsSection title={TYPE_SECTIONS.casts}>
  <p>
    A type assertion, <code>value as T</code>, makes the compiler treat the value as a
    <code>T</code>. The handbook is plain about what it does at run time:
    <q>there is no runtime checking associated with a type assertion</q>. It is a claim, and the
    compiler stops checking it. If the claim is wrong, the program runs on with a value of the wrong
    type until something fails, often far from the assertion:
  </p>
  <CompiledComparison
    label="A claim about parsed JSON"
    items={[
      {
        title: 'as Book',
        example: CLAIMED_ROW,
        missed: 'book.title is the number 214, and toUpperCase throws a TypeError.',
      },
    ]}
  />
  <p>
    The compiler does reject an assertion between types that cannot overlap, and its message names
    the way around that check. Going through <code>unknown</code> compiles, which shows that the only
    limit on an assertion is the person writing it:
  </p>
  <CompiledComparison
    label="Impossible, then forced"
    items={[
      { title: "'many' as number", example: IMPOSSIBLE_ASSERTION },
      {
        title: "'many' as unknown as number",
        example: DOUBLE_ASSERTION,
        missed: 'count is a string typed as a number.',
      },
    ]}
  />
  <p>Each common reason for an assertion has an alternative that keeps the checking on:</p>
  <StepList>
    <StepItem title="Construct the value so its type follows">
      <p>
        Build the value from parts whose types are already right, instead of asserting the result. A
        capture read from storage is assembled field by field from checked parts, and its type
        follows from theirs.
      </p>
    </StepItem>
    <StepItem title="Narrow with a real check">
      <p>
        Replace <code>x as Book</code> with a check that runs: <code>typeof</code>,
        <code>instanceof</code>, <code>in</code>, a discriminant, or a guard with a test. The check
        and the type then agree, because the type came from the check.
      </p>
    </StepItem>
    <StepItem title="Widen the parameter">
      <p>
        When a caller holds a wider type than a function takes, change the parameter to what callers
        really have, and handle the difference inside, rather than asserting at every call.
      </p>
    </StepItem>
  </StepList>
  <p>
    <code>as const</code> is not an assertion in this sense, and is always fine. The
    <a href={ARCHITECTURE_CASTS_HREF}>architecture page</a> gives Dokseo's rule;
    <a href={typeHref('assertions')}>The two places Dokseo still asserts</a> shows the code.
  </p>
</DocsSection>
