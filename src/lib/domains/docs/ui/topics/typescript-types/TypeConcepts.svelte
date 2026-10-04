<script lang="ts">
  import StepItem from '$lib/components/StepItem.svelte';
  import StepList from '$lib/components/StepList.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import CompiledComparison from './CompiledComparison.svelte';
  import {
    ALIASED_IDS,
    EXHAUSTIVE_MATCH,
    FLAG_STATE,
    FRESH_LITERAL,
    INCLUDES_GUARD,
    INFERRED_FILTER,
    LITERAL_UNION,
    LYING_GUARD,
    NARROWING_CHECKS,
    NARROWED_READ,
    NEVER_SWITCH,
    SHARED_FIELDS,
    SOME_GUARD,
    STALE_LITERAL,
    UNION_STATE,
    UNNARROWED_READ,
    WIDER_ARRAY,
    WRITTEN_NOTE,
  } from './concept-examples';
  import FlagStatesDemo from './FlagStatesDemo.svelte';
  import NarrowingDemo from './NarrowingDemo.svelte';
  import {
    ARCHITECTURE_EXHAUSTIVE_HREF,
    ARCHITECTURE_FAILURES_HREF,
    TYPE_SECTIONS,
    typeHref,
  } from './type-sections';
</script>

<DocsSection title={TYPE_SECTIONS.structural}>
  <p>
    Many developers first meet TypeScript as annotations: a parameter gets <code>: string</code>, a
    function gets a return type, and the editor completes property names. That is useful, but it
    leaves most of the type system unused. The other use is writing types so that a wrong value, or
    a wrong combination of values, cannot be written down at all, and the compiler reports the
    mistake before anything runs.
  </p>
  <p>
    Writing such types starts with how TypeScript compares two types. The handbook puts it this way:
    <q
      >Type compatibility in TypeScript is based on structural subtyping. Structural typing is a way
      of relating types based solely on their members.</q
    >
    A value fits a type when it has the members the type lists, whatever name the type was given. Languages
    such as Java and C# are <em>nominal</em> instead: there, two classes with identical fields are still
    different types because they have different names.
  </p>
  <p>
    Structural typing suits JavaScript, where objects are built from literals and passed around
    without a class. Its cost is that a name alone protects nothing. Here a book id and a tag id are
    both strings under two different names, and passing one where the other belongs compiles:
  </p>
  <CompiledComparison
    label="Two names for one type"
    items={[
      {
        title: 'Type aliases',
        example: ALIASED_IDS,
        missed: 'A tag id goes where a book id belongs, and nothing reports it.',
      },
    ]}
  />
  <p>
    A <code>type</code> declaration is an alias, a second name for the same type. Both names mean
    <code>string</code>, so <code>openBook(tag)</code> passes a string to a function that takes a
    string. <a href={typeHref('brands')}>Brands for ids and units</a> shows how to make the two names
    different types.
  </p>
</DocsSection>

<DocsSection title={TYPE_SECTIONS.holes}>
  <p>
    TypeScript is deliberately not <em>sound</em>: some code compiles even though it can fail at run
    time. The handbook says so directly:
    <q
      >TypeScript's type system allows certain operations that can't be known at compile-time to be
      safe.</q
    >
  </p>
  <p>
    Arrays are one such place. An array of strings fits a variable typed as an array of strings or
    numbers, which is right for reading and wrong for writing:
  </p>
  <CompiledComparison
    label="An array read through a wider type"
    items={[
      {
        title: 'Push through the wider name',
        example: WIDER_ARRAY,
        missed: 'At run time, titles[1] is the number 214, and the last line throws a TypeError.',
      },
    ]}
  />
  <StepList>
    <StepItem title="Two names, one array">
      <p><code>mixed</code> and <code>titles</code> refer to the same array object.</p>
    </StepItem>
    <StepItem title="A number goes in">
      <p>
        <code>mixed.push(214)</code> is legal, because <code>mixed</code> is typed to hold numbers.
      </p>
    </StepItem>
    <StepItem title="A string is read out">
      <p>
        <code>titles[1]</code> is typed <code>string</code>, so <code>toUpperCase()</code> compiles, and
        at run time the call fails because a number has no such method.
      </p>
    </StepItem>
  </StepList>
  <p>
    Methods have a related gap. Under <code>strictFunctionTypes</code>, part of
    <code>--strict</code>, function parameters are checked contravariantly, which is the safe
    direction. The TypeScript 2.6 release notes give the exception:
    <q
      >The stricter checking applies to all function types, except those originating in method or
      constructor declarations.</q
    >
    A parameter declared with method syntax, <code>save(tag: Tag): void</code>, is still compared in
    both directions.
  </p>
  <p>
    Extra properties are another. An object literal written straight into a typed position gets an <em
      >excess property check</em
    >, which catches a typo. The same object stored in a variable first does not, because
    structurally it still has every member the type lists:
  </p>
  <CompiledComparison
    label="The same object, written two ways"
    items={[
      { title: 'A literal in place', example: FRESH_LITERAL },
      {
        title: 'Through a variable',
        example: STALE_LITERAL,
        missed: 'The typo titel compiles, because row has every member Book lists.',
      },
    ]}
  />
</DocsSection>

<DocsSection title={TYPE_SECTIONS.unions}>
  <p>
    A <em>union</em> type, written <code>A | B</code>, holds a value that is one of the members. A
    union of string literals is the simplest useful case: the type below allows exactly three
    strings, and any other string fails to compile.
  </p>
  <CompiledComparison
    label="A union of literals"
    items={[{ title: 'Three strings allowed', example: LITERAL_UNION }]}
  />
  <p>
    An <em>intersection</em>, <code>A &amp; B</code>, holds a value that is both at once, so it
    needs every member of <code>A</code> and every member of <code>B</code>. It is how a type is
    built from parts that several types share:
  </p>
  <CompiledComparison
    label="An intersection of two object types"
    items={[{ title: 'Both halves required', example: SHARED_FIELDS }]}
  />
  <p>
    The two combine. A union of intersections lists several variants that share some fields and
    differ in others, which is how Dokseo's captures are built, in
    <a href={typeHref('captures')}>A capture is a union on its origin</a>.
  </p>
</DocsSection>

<DocsSection title={TYPE_SECTIONS.discriminated}>
  <p>
    A union of object types becomes far more useful when every member has one field with a different
    literal type, such as <code>kind: 'loading'</code>, <code>kind: 'failed'</code> and
    <code>kind: 'ready'</code>. That field is the <em>discriminant</em>, and the union is a
    <em>discriminated union</em>. After a check on the discriminant, the compiler narrows the value
    to the matching member, and that member's other fields become readable.
  </p>
  <p>
    The members do not have to share anything else. A failed load has a message and no titles; a
    ready load has titles and no message. Writing a failed load that also holds titles fails to
    compile, because no member of the union has both:
  </p>
  <CompiledComparison
    label="One field too many"
    items={[{ title: 'A failed load with titles', example: UNION_STATE }]}
  />
  <p>
    The same check stops a capture written by hand from holding a note, when only a recognized
    capture can have one:
  </p>
  <CompiledComparison
    label="A field only one variant has"
    items={[{ title: 'A written capture with a note', example: WRITTEN_NOTE }]}
  />
  <p>
    Dokseo names the discriminant <code>kind</code> for results and states, as the
    <a href={ARCHITECTURE_FAILURES_HREF}>architecture page</a> explains for use case results. A
    union may use another name when the field means something of its own: captures are discriminated
    on
    <code>origin</code>.
  </p>
</DocsSection>

<DocsSection title={TYPE_SECTIONS.narrowing}>
  <p>
    A value typed as a union only allows what every member allows. To read a field that only some
    members have, the code first has to check which member it holds. The handbook defines the word:
    <q>The process of refining types to more specific types than declared is called narrowing.</q>
  </p>
  <CompiledComparison
    label="Reading a field before and after a check"
    items={[
      { title: 'No check', example: UNNARROWED_READ },
      { title: 'A discriminant check', example: NARROWED_READ },
    ]}
  />
  <p>
    TypeScript follows ordinary JavaScript checks through the code, and after each one it narrows
    the type inside the branch and removes the matched part from what is left after it:
  </p>
  <CompiledComparison
    label="Four checks the compiler narrows on"
    items={[{ title: 'Equality, typeof, instanceof and in', example: NARROWING_CHECKS }]}
  />
  <p>
    <code>typeof</code> narrows to the eight results JavaScript defines, from
    <code>"string"</code> to <code>"function"</code>. <code>instanceof</code> narrows to a class.
    <code>in</code> narrows to the members that declare the property, optional or not. A discriminant
    comparison narrows to the members whose literal matches. The demo runs the same chain of checks on
    real values:
  </p>
  <NarrowingDemo />
</DocsSection>

<DocsSection title={TYPE_SECTIONS.guards}>
  <p>
    Some checks are too long to write inline, so they go in a function. A plain function that
    returns <code>boolean</code> narrows nothing at the call site, because narrowing does not follow
    a check into a called function. A <em>type guard</em> declares its meaning in the return type,
    as a
    <em>type predicate</em>: <code>value is string</code> says that when the function returns
    <code>true</code>, its argument is a string.
  </p>
  <p>
    The predicate is a claim, and the compiler does not check the body against it. A guard whose
    body tests the wrong thing compiles, and every caller narrows on it:
  </p>
  <CompiledComparison
    label="A guard that tests the wrong thing"
    items={[
      {
        title: 'The predicate and the body disagree',
        example: LYING_GUARD,
        missed:
          'isText(214) returns true, the branch treats 214 as a string, and toUpperCase throws a TypeError at run time.',
      },
    ]}
  />
  <p>
    So a guard belongs to the small set of places where a mistake goes unreported, like an
    <code>as</code> cast, and it gets the same care: keep it short, give it a unit test, and write
    it once for each type. Since TypeScript 5.5 the compiler also infers a predicate, with no
    annotation, for a function that has no declared return type and a single <code>return</code> of
    a check on its parameter, which removes the chance of the two disagreeing. That is why a
    <code>filter</code>
    with a <code>typeof</code> test now returns the narrowed array:
  </p>
  <CompiledComparison
    label="An inferred predicate"
    items={[{ title: 'filter with typeof', example: INFERRED_FILTER }]}
  />
  <p>
    A guard also has to compile in the first place. The obvious body for a guard over a list of
    literals does not, because <code>includes</code> on a readonly tuple of languages takes one of
    those languages, and the value is still <code>unknown</code>. Comparing each member with
    <code>===</code> works, because equality is allowed on <code>unknown</code>:
  </p>
  <CompiledComparison
    label="A guard over a list of literals"
    items={[
      { title: 'includes', example: INCLUDES_GUARD },
      { title: 'some with ===', example: SOME_GUARD },
    ]}
  />
</DocsSection>

<DocsSection title={TYPE_SECTIONS.illegal}>
  <p>
    The phrase "make illegal states unrepresentable" names the idea behind all of this: choose types
    so that every value they allow is one that makes sense. A common way to miss it is to describe a
    state with independent booleans and optional fields.
  </p>
  <p>
    Take a screen that loads a list of titles. It can be loading, it can have failed with a message,
    or it can be ready with the titles. Written as flags, the type allows every combination of them,
    including ones that mean nothing:
  </p>
  <CompiledComparison
    label="Two flags at once"
    items={[
      {
        title: 'Loading and failed, with titles',
        example: FLAG_STATE,
        missed: 'A load that is loading, failed and holding titles at once compiles.',
      },
    ]}
  />
  <p>That freedom allows a bug like this one:</p>
  <StepList>
    <StepItem title="Loading starts">
      <p>The screen sets <code>loading: true</code> and shows a spinner while it waits.</p>
    </StepItem>
    <StepItem title="The read fails">
      <p>
        The failure handler sets <code>failed: true</code> and a <code>message</code>, and does not
        reset <code>loading</code>, because nothing in the type requires it.
      </p>
    </StepItem>
    <StepItem title="The screen shows the wrong state">
      <p>
        The template checks <code>loading</code> first, so the spinner stays up and the message is never
        shown. The person reading waits for a list that will never arrive.
      </p>
    </StepItem>
  </StepList>
  <p>
    A discriminated union lists the three real states instead, each with only the fields it uses.
    Moving from loading to failed means writing a new value with <code>kind: 'failed'</code>; there
    is no leftover flag to forget, and a failed value has nowhere to put titles. The demo counts
    what each type allows:
  </p>
  <FlagStatesDemo />
  <p>
    Three booleans allow eight combinations, of which three mean something. Each optional field
    doubles the count, and the number of meaningful ones stays at three. The union allows exactly
    three. Code that reads it matches on <code>kind</code>, and no branch is needed for
    <q>loading and failed</q>, because that value cannot exist.
  </p>
</DocsSection>

<DocsSection title={TYPE_SECTIONS.exhaustive}>
  <p>
    A union only protects code that handles every member, and that goes on handling every member
    after someone adds one. The <a href={ARCHITECTURE_EXHAUSTIVE_HREF}>architecture page</a> shows
    the problem on a real use case result: a new variant falls into the last <code>else</code> of an if
    chain, and the code still compiles. Either of two techniques makes the compiler report it instead.
  </p>
  <p>
    The first needs no library. The <code>never</code> type has no values, and in the handbook's
    words
    <q>no type is assignable to never (except never itself)</q>. After a <code>switch</code> has
    handled every member, the variable in the <code>default</code> branch has been narrowed to
    <code>never</code>, so assigning it to a <code>never</code> variable compiles. When a member is missing,
    that member is what is left, and the assignment fails with its name.
  </p>
  <p>
    The second is <a href="https://github.com/gvergnaud/ts-pattern">ts-pattern</a>'s
    <code>match(value)</code>, with one <code>.with()</code> per case and
    <code>.exhaustive()</code> at the end. Both catch a fourth language, <code>'zh'</code>, added to
    the union with no case for it:
  </p>
  <CompiledComparison
    label="A new member with no case"
    items={[
      { title: 'switch and never', example: NEVER_SWITCH },
      { title: 'match().exhaustive()', example: EXHAUSTIVE_MATCH },
    ]}
  />
  <p>
    The <code>never</code> error names the missing member as the type that does not fit. The
    ts-pattern error is less direct, <q>This expression is not callable</q>, because the library
    types
    <code>.exhaustive</code> as a <code>NonExhaustiveError</code> value when cases are missing; the missing
    member appears inside the angle brackets. ts-pattern also matches nested values and tuples, and it
    throws at run time if a value matches no pattern.
  </p>
</DocsSection>
