<script lang="ts">
  import StepItem from '$lib/ui/components/StepItem.svelte';
  import StepList from '$lib/ui/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { WORKER_BOUNDARY } from '../architecture/architecture-snippets';
  import CaptureRowDemo from './CaptureRowDemo.svelte';
  import CompiledComparison from './CompiledComparison.svelte';
  import { OFFSCREEN_CONTEXT } from './tool-examples';
  import {
    ARCHITECTURE_CASTS_HREF,
    ARCHITECTURE_EXHAUSTIVE_HREF,
    ARCHITECTURE_LANGUAGES_HREF,
    ARCHITECTURE_QUERIES_HREF,
    IDENTITY_UNREADABLE_HREF,
    STORAGE_ROWS_HREF,
    TOUCH_MARQUEE_HREF,
    TYPE_SECTIONS,
    typeHref,
  } from './type-sections';
  import {
    ANCHOR_UNION,
    BRANDED_IDS_SOURCE,
    CAPTURE_ORIGIN_MATCH,
    CAPTURE_UNION,
    DOCK_TOKENS,
    IMAGE_INDEX,
    IMAGE_LAYOUT_KIND,
    LANGUAGE,
    MARQUEE_CLASSIFIER,
    MARQUEE_END,
    MINTED_IDS,
    MODEL_FOOTPRINT,
    MOVE_ORDER,
    PDF_RENDER,
    READ_QUERY,
    READ_SNAPSHOT,
    READ_STATE_OF,
    READING_PLACE,
    REMEMBERED_SET,
    RESUMED_CFI,
    SCREEN_TO_IMAGE,
    SELECTION_ARM,
    SPACE_RECT,
    STORED_ANCHOR,
    STORED_CAPTURE_TYPE,
    STORED_FIELDS,
    TAG_COLOURS_TAIL,
    TO_IMAGE_LAYOUT,
    WRITE_NOTE,
  } from './type-snippets';
</script>

<DocsSection title={TYPE_SECTIONS.ids}>
  <p>
    Dokseo is a manga and EPUB reader that runs in the browser and keeps its books, captures and
    tags in IndexedDB and the origin private file system. Every one of those records is found by an
    id,
    <code>src/lib/shared/ids.ts</code> brands four string ids, <code>BookId</code>,
    <code>CaptureId</code>, <code>TagId</code> and <code>ContentHash</code>, and one number,
    <code>ImageIndex</code>, the position of a page image in a book.
  </p>
  <DocsCode label={BRANDED_IDS_SOURCE.label} code={BRANDED_IDS_SOURCE.code} />
  <DocsCode label={IMAGE_INDEX.label} code={IMAGE_INDEX.code} />
  <p>
    Each brand has one constructor, and the file holds the only assertions. A new id is minted from
    a value Dokseo made itself, as in <code>captureId(crypto.randomUUID())</code>. Book ids have a
    second constructor that checks before it mints. A book id names the book's files in the origin
    private file system, as <code>`$&#123;id&#125;.src`</code>, and it arrives as text from two
    places outside the program: a stored row and the <code>/read/[fileId]</code> address.
    <code>parsedBookId</code>
    returns <code>null</code> for an empty id or one that contains a path, so a value that reaches a file
    key is a flat name:
  </p>
  <DocsCode label={MINTED_IDS.label} code={MINTED_IDS.code} />
  <p>
    These brands are covariant, the form <a href={typeHref('variance')}>The covariant brand hole</a>
    shows to have a gap in generic functions. Dokseo has no function generic over an id brand, so the
    gap stays closed in practice; the invariant form is used where a generic function exists, for rectangles.
  </p>
</DocsSection>

<DocsSection title={TYPE_SECTIONS.spaces}>
  <p>
    A selection on a page is drawn in screen pixels, from pointer events. Recognition needs the same
    box in the pixels of the page image, which may be scaled, so the numbers differ. Both are four
    numbers, and mixing them causes no error at run time, only a crop of the wrong part of the page
    and the wrong recognized text. So <code>shared/geometry.ts</code> brands the space, with the invariant
    form:
  </p>
  <DocsCode label={SPACE_RECT.label} code={SPACE_RECT.code} />
  <p>
    <code>rect</code> holds the only assertion, and only <code>screenRect</code>,
    <code>imageRect</code> and <code>pageRect</code> call it. A <code>PageRect</code> is the stored space:
    fractions of the page from 0 to 1. One function in the viewing domain converts from one space to the
    other, using where the image is drawn on screen and its natural size:
  </p>
  <DocsCode label={SCREEN_TO_IMAGE.label} code={SCREEN_TO_IMAGE.code} />
  <p>
    <code>clampTo(selection, frame)</code> compiles because both are screen rectangles. Passing
    <code>overlap</code> to code that takes an image rectangle would not, which is why the function
    has to build its result with <code>imageRect</code> from scaled numbers.
  </p>
</DocsSection>

<DocsSection title={TYPE_SECTIONS.rows}>
  <p>
    IndexedDB stores any structured value and checks none of it, so a row read back may come from a
    pre-release version of Dokseo or from a bug. The
    <a href={STORAGE_ROWS_HREF}>storage page</a> follows a damaged book row through the library;
    here the interest is the types. A stored row's type maps every field of the domain type to
    <code>unknown</code>, and makes it optional:
  </p>
  <DocsCode label={STORED_CAPTURE_TYPE.label} code={STORED_CAPTURE_TYPE.code} />
  <p>
    The mapper then checks each field with a guard from <code>shared/corrupt-row.ts</code>.
    <code>knownStoredValue</code> returns the value narrowed by the guard, or throws a
    <code>CorruptRow</code> error that names the row and the field. <code>isStoredFields</code> is
    the guard that opens a nested object, typing it as
    <code>&#123; readonly [field: string]: unknown &#125;</code> so its fields can be read and checked
    in turn:
  </p>
  <DocsCode label={STORED_FIELDS.label} code={STORED_FIELDS.code} />
  <DocsCode label={STORED_ANCHOR.label} code={STORED_ANCHOR.code} />
  <p>
    <code>match(anchor.kind)</code> runs on an <code>unknown</code> value, so it ends in
    <code>.otherwise</code> rather than <code>.exhaustive()</code>: an unknown kind is a damaged
    row, and the arm throws. No field has a default: a missing origin or a missing note throws like
    a missing text, because a guess would look like data and the next save would store it. A row
    that throws is set aside by its id, so one bad capture does not stop the others from loading.
    Try it on a real row:
  </p>
  <CaptureRowDemo />
  <p>
    What happens to an unreadable book afterwards, and how Dokseo merges or removes it, is on the
    <a href={IDENTITY_UNREADABLE_HREF}>book identity page</a>. The same guards read the export file,
    and a saved list in <code>localStorage</code> goes through the same steps in miniature:
  </p>
  <DocsCode label={REMEMBERED_SET.label} code={REMEMBERED_SET.code} />
</DocsSection>

<DocsSection title={TYPE_SECTIONS.captures}>
  <p>
    A capture is a piece of text the reader keeps: recognized from a selection, written by hand, or
    selected in an EPUB's own text, which Dokseo calls lifted. A recognized or lifted capture can
    have a note, a comment on text that came from the book; a written capture is the reader's own
    text and has no separate note. So
    <code>Capture</code> is a union of three variants on <code>origin</code>, each an intersection
    of shared parts and its own fields:
  </p>
  <DocsCode label={CAPTURE_UNION.label} code={CAPTURE_UNION.code} />
  <p>
    A written capture has no <code>note</code> field, so no code can give it one. The use case that writes
    a note takes only the variants that have one, and a written capture fails to compile at the call:
  </p>
  <DocsCode label={WRITE_NOTE.label} code={WRITE_NOTE.code} />
  <p>
    The stored row is not a union: its type is every field of the widest variant, each
    <code>unknown</code>, because nothing about a row is known before it is checked. The mapper
    reads the origin first and builds that variant. A field the variant has must be present, with
    <code>null</code> allowed for a note or a confidence, and a field the variant does not have must
    be absent, so a written row with a note or a confidence is unreadable rather than trimmed. The
    demo above shows that with the
    <q>origin: 'written', note and confidence kept</q> row.
  </p>
  <DocsCode label={CAPTURE_ORIGIN_MATCH.label} code={CAPTURE_ORIGIN_MATCH.code} />
</DocsSection>

<DocsSection title={TYPE_SECTIONS.selection}>
  <p>
    A drag on a page can end three ways: it barely moved and is a click, it moved but drew a box
    below the minimum size, or it drew a usable box. An earlier version handled the end of a drag
    with two early returns in a row, and both called the click handler, which shows or hides the
    reader's controls. That produced this bug:
  </p>
  <StepList>
    <StepItem title="A long, thin drag">
      <p>
        The reader drags across a line of text and draws a box about 200 pixels wide and 5 pixels
        tall.
      </p>
    </StepItem>
    <StepItem title="The first guard catches it">
      <p>
        It is below the 12 pixel minimum in one direction, so the first guard treats it as unusable
        and returns early through the click handler, the same path a real click took.
      </p>
    </StepItem>
    <StepItem title="The controls flip">
      <p>
        Instead of a selection, the reader's controls appear or disappear, which nothing about the
        drag asked for.
      </p>
    </StepItem>
  </StepList>
  <p>
    The fix named the outcomes, so the click handler runs for exactly one of them. The classifier
    now lives in the base component:
  </p>
  <DocsCode label={MARQUEE_END.label} code={MARQUEE_END.code} />
  <DocsCode label={MARQUEE_CLASSIFIER.label} code={MARQUEE_CLASSIFIER.code} />
  <p>
    The classifier is a pure function with unit tests, and the viewing domain matches on its result
    with <code>.exhaustive()</code>, so a fourth way to end a drag would fail to compile there until
    it had an arm. The base component imports no app types, so its rectangle is plain numbers; the
    arm for a selection mints the screen rectangle as it crosses into the domain:
  </p>
  <DocsCode label={SELECTION_ARM.label} code={SELECTION_ARM.code} />
  <p>
    The <a href={TOUCH_MARQUEE_HREF}>touch and pointers page</a> runs the real selection and logs
    each
    <code>MarqueeEnd</code>.
  </p>
</DocsSection>

<DocsSection title={TYPE_SECTIONS.places}>
  <p>
    A book's reading position depends on what kind of book it is. An image book is read by page
    image; an EPUB is read by a location in its text, an EPUB CFI. Rather than one record with
    optional fields for both, <code>ReadingPlace</code> is a union, and each variant has only its own
    fields:
  </p>
  <DocsCode label={READING_PLACE.label} code={READING_PLACE.code} />
  <DocsCode label={RESUMED_CFI.label} code={RESUMED_CFI.code} />
  <p>
    A capture's <code>Anchor</code>, where on the page or in the text it came from, is built the
    same way, with regions of page images for one variant and a CFI and quoted text for the other:
  </p>
  <DocsCode label={ANCHOR_UNION.label} code={ANCHOR_UNION.code} />
</DocsSection>

<DocsSection title={TYPE_SECTIONS.loads}>
  <p>
    Dokseo reads its stored data through TanStack Query, as the
    <a href={ARCHITECTURE_QUERIES_HREF}>architecture page</a> describes. The library's own result
    type is already a discriminated union on <code>status</code>, with boolean flags such as
    <code>isError</code> and <code>isLoadingError</code> typed as literals in each member. An error comes
    in two forms: a first load that failed has no data, and a refetch that failed keeps the data it had.
  </p>
  <p>
    Dokseo's screens do not use the library's type directly. <code>shared/read-state.ts</code> declares
    only the fields it reads, as a smaller union:
  </p>
  <DocsCode label={READ_SNAPSHOT.label} code={READ_SNAPSHOT.code} />
  <p>
    The library's result fits it by <a href={typeHref('structural')}>structural typing</a>, with no
    assertion, so the query is passed straight in. One match turns it into the three states a screen
    shows, and a failed refetch still shows its data:
  </p>
  <DocsCode label={READ_QUERY.label} code={READ_QUERY.code} />
  <DocsCode label={READ_STATE_OF.label} code={READ_STATE_OF.code} />
</DocsSection>

<DocsSection title={TYPE_SECTIONS.korean}>
  <p>
    Every book records its language, and code that depends on the language matches on it. When the
    <code>Language</code> type was first written, Dokseo read only Japanese, and the type already
    listed <code>'ko'</code>. Each exhaustive match on a language then had to say something about
    Korean, so the model lookup for Korean said <code>null</code>, no model, rather than falling
    back to the Japanese one. When a Korean recognition model was added, that arm changed to return
    it. English was added to the union later.
  </p>
  <DocsCode label={LANGUAGE.label} code={LANGUAGE.code} />
  <DocsCode label={MODEL_FOOTPRINT.label} code={MODEL_FOOTPRINT.code} />
  <p>
    Adding a fourth language works the same way: every <code>.exhaustive()</code> over
    <code>Language</code> fails to compile until it has an arm, as
    <a href={typeHref('exhaustive')}>Exhaustive checks with never and match</a> showed with
    <code>'zh'</code>. The list of languages cannot fall out of step with the union, because the
    union is taken from the list: <code>LANGUAGES</code> is written first with
    <code>as const</code>, and <code>Language</code> is <code>(typeof LANGUAGES)[number]</code>, as
    <a href={typeHref('satisfies')}>as const and satisfies</a> showed. A language missing from the
    list is missing from the type too, and <code>isLanguage</code>, a guard over that list, accepts
    every member. The tag color list is built the same way. The dock's token table goes the other
    direction, union first, and there <code>satisfies</code> checks that every key is present.
  </p>
  <DocsCode label={TAG_COLOURS_TAIL.label} code={TAG_COLOURS_TAIL.code} />
  <DocsCode label={DOCK_TOKENS.label} code={DOCK_TOKENS.code} />
  <p>
    How each language's recognizer is loaded is on the
    <a href={ARCHITECTURE_LANGUAGES_HREF}>architecture page</a>.
  </p>
</DocsSection>

<DocsSection title={TYPE_SECTIONS.imageKinds}>
  <p>
    A book's layout is paged (manga), continuous (a vertical strip such as a webtoon) or flow (an
    EPUB). Page turning, page pairing and page fit apply only to image books. Giving each of them a
    <code>'flow'</code> arm would mean inventing a value for a book with no pages, so they take a narrower
    union:
  </p>
  <DocsCode label={IMAGE_LAYOUT_KIND.label} code={IMAGE_LAYOUT_KIND.code} />
  <DocsCode label={TO_IMAGE_LAYOUT.label} code={TO_IMAGE_LAYOUT.code} />
  <p>
    <code>imageLayoutKind</code> is the one place the wide union becomes the narrow one. It returns
    <code>null</code> for a flow book instead of throwing, so every caller has to say what it does for
    one. A match over the narrow union stays exhaustive over two members:
  </p>
  <DocsCode label={MOVE_ORDER.label} code={MOVE_ORDER.code} />
</DocsSection>

<DocsSection title={TYPE_SECTIONS.assertions}>
  <p>
    Application code in Dokseo has no <code>as</code> casts apart from two kinds of place, both kept
    in one named function or line in the file that owns them. The first is the brand constructors in
    <code>shared/ids.ts</code> and <code>shared/geometry.ts</code>, shown above. The second is a
    library boundary where the types are missing or wrong.
  </p>
  <p>
    pdf.js renders a page into a 2D context, and its type for that parameter is the page's
    <code>CanvasRenderingContext2D</code>. Dokseo renders in an <code>OffscreenCanvas</code>, whose
    context type lacks two members the page context has, so the call fails to compile without an
    assertion:
  </p>
  <CompiledComparison
    label="The render context"
    items={[{ title: 'pdf.js parameter type, offscreen context', example: OFFSCREEN_CONTEXT }]}
  />
  <DocsCode label={PDF_RENDER.label} code={PDF_RENDER.code} />
  <p>
    The workers have the other cases. Dokseo's TypeScript configuration includes the DOM library,
    which describes a page, so <code>self</code> in a worker file is typed as a window. Each worker
    declares the two calls it makes, with its own message types, and asserts <code>self</code> to that
    once. The OCR worker also asserts the ONNX sessions and output tensors that transformers.js returns
    without usable types:
  </p>
  <DocsCode label={WORKER_BOUNDARY.label} code={WORKER_BOUNDARY.code} />
  <p>
    Past each of these functions the rest of the file works with correct types. The
    <a href={ARCHITECTURE_CASTS_HREF}>architecture page</a> states the rule, and
    <a href={ARCHITECTURE_EXHAUSTIVE_HREF}>its exhaustive matching demo</a> shows a use case union widened
    by one variant.
  </p>
</DocsSection>

<DocsSection title={TYPE_SECTIONS.rules}>
  <ul>
    <li>
      Name three or more states, conditions or outcomes as a discriminated union, and match it with
      <code>match(...).exhaustive()</code>. A two-variant union may narrow with an <code>if</code>.
    </li>
    <li>
      Give a variant only the fields it has. Never add a field that is always <code>null</code> on one
      variant to make two variants look alike.
    </li>
    <li>
      Brand ids and coordinate spaces. Mint a brand only in its constructor; make a brand invariant
      wherever a function is generic over it.
    </li>
    <li>
      Type stored and parsed data as <code>unknown</code>, and check it field by field where it
      enters. Give no field a default: throw a <code>CorruptRow</code> and set the row aside by its id.
    </li>
    <li>
      Write no <code>as</code> cast in application code. Construct the value so its type follows,
      narrow with a real check, or widen the parameter. The two exceptions are a brand constructor
      and one named function at a library boundary. <code>as const</code> is always fine.
    </li>
    <li>
      Keep a type guard short and tested, because the compiler narrows on its predicate without
      checking its body.
    </li>
  </ul>
</DocsSection>
