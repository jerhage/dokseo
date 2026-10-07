<script lang="ts">
  import Diagram from '$lib/ui/components/Diagram.svelte';
  import Figure from '$lib/ui/components/Figure.svelte';
  import StepItem from '$lib/ui/components/StepItem.svelte';
  import StepList from '$lib/ui/components/StepList.svelte';
  import Table from '$lib/ui/components/Table.svelte';
  import DocsCode from '../DocsCode.svelte';
  import DocsPage from '../DocsPage.svelte';
  import DocsSection from '../DocsSection.svelte';
  import {
    COPING_EDGES,
    COPING_HEIGHT,
    COPING_LABEL,
    COPING_NODES,
    COPING_WIDTH,
  } from './triple-click-selection/coping-diagram';
  import EdgeDiagram from './triple-click-selection/EdgeDiagram.svelte';
  import { CHROME_EDGES, FIREFOX_EDGES } from './triple-click-selection/edge-diagram';
  import SelectionDemo from './triple-click-selection/SelectionDemo.svelte';
  import {
    EPUB_ANCHORING_HREF,
    EPUB_CFI_HREF,
    TRIPLE_CLICK_SECTIONS,
    tripleClickSectionHref,
  } from './triple-click-selection/triple-click-sections';
  import {
    COLLAPSED_CFI,
    LIFTED_RANGE,
    PART_TO_STRING,
    STORED_CFI_FIRST,
    TEXT_EDGES,
  } from './triple-click-selection/triple-click-snippets';
</script>

{#snippet firefoxTitle()}Firefox{/snippet}
{#snippet chromeTitle()}Chrome and Safari{/snippet}
{#snippet copingTitle()}New captures and stored ones{/snippet}

<DocsPage slug="triple-click-selection" sections={Object.values(TRIPLE_CLICK_SECTIONS)}>
  {#snippet lead()}
    A triple-click selects a paragraph, but Firefox, Chrome and Safari build different ranges for
    it. Firefox's range made EPUB captures in Dokseo that never highlighted.
  {/snippet}

  <DocsSection title={TRIPLE_CLICK_SECTIONS.found}>
    <p class="prose">
      In Dokseo's EPUB reader, selecting text and pressing the pencil saves a capture. It keeps <a
        href={EPUB_ANCHORING_HREF}>two ways back to the passage</a
      >: a CFI, which is a path to the text, and a quote of the text.
    </p>
    <p class="prose">
      In Firefox, some captures never showed their highlight, and Go to passage opened the right
      chapter with no ring around the text. Captures made by dragging or double-clicking worked, and
      so did every capture made in Chrome or Safari. The exported captures file had the right
      quotes; the CFIs differed. Two from the same chapter, as recorded in the export:
    </p>
    <Table size="sm">
      <thead>
        <tr><th>Capture</th><th>Stored CFI</th><th>Start</th><th>End</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>Never highlighted</td>
          <td><code>epubcfi(/6/12!/4,/16,/16)</code></td>
          <td><code>/16</code></td>
          <td><code>/16</code></td>
        </tr>
        <tr>
          <td>Highlighted</td>
          <td><code>epubcfi(/6/12!/4/4,/1:0,/1:11)</code></td>
          <td><code>/1:0</code></td>
          <td><code>/1:11</code></td>
        </tr>
      </tbody>
    </Table>
    <p class="prose">
      A range CFI is a shared path, then the start, then the end, separated by commas. The working
      one runs from character 0 to character 11 of a text node. The broken one starts and ends at
      the same point, <code>/16</code>, so it holds no text. Every broken capture had a start equal
      to its end, and I found what they shared: each passage had been selected with a triple-click.
    </p>
  </DocsSection>

  <DocsSection title={TRIPLE_CLICK_SECTIONS.edges}>
    <p class="prose">
      A selection is a DOM <code>Range</code> with two boundary points, each a container node and an
      offset. In a text node the offset counts characters. In an element it counts child nodes, so
      <code>(p, 1)</code> means after the paragraph's first child.
    </p>
    <div class="grid-auto-fit">
      <Figure title={firefoxTitle}><EdgeDiagram diagram={FIREFOX_EDGES} /></Figure>
      <Figure title={chromeTitle}><EdgeDiagram diagram={CHROME_EDGES} /></Figure>
    </div>
    <ul class="prose">
      <li>
        <strong>Firefox</strong> puts both edges on the <code>&lt;p&gt;</code>:
        <code>(p, 0)</code> to <code>(p, 1)</code>, before and after its one text node. Bugzilla
        516782, "Triple-click to select paragraph sets its ranges incorrectly", reported that end
        offset of 1 in 2009 and was closed as invalid: the end container is the element, so 1 is a
        child count.
      </li>
      <li>
        <strong>Chrome</strong> starts in the text at offset 0 and ends at <code>(next p, 0)</code>,
        the start of the following paragraph.
      </li>
      <li>
        <strong>Safari</strong> does the same. WebKit's paragraph selection moves the end one position
        past the paragraph, with the comment "Include the 'paragraph break' (the space from the end of
        this paragraph to the start of the next one) in the selection." In Playwright's WebKit 26.6 and
        Chromium 153 I observed the same range, and on the last paragraph, with no next one, both ended
        inside the text.
      </li>
    </ul>
  </DocsSection>

  <DocsSection title={TRIPLE_CLICK_SECTIONS.demo}>
    <p class="prose">
      Triple-click the middle paragraph. In Firefox the first CFI below collapses; in Chrome or
      Safari the buttons set Firefox's range to show it.
    </p>
    <SelectionDemo />
    <p class="prose">
      The sample has a space between its paragraphs, as most chapters have whitespace between tags.
      That space is a text node too, so <code>textEdges</code> ends a Chrome range after it, outside
      both paragraphs: the <code>/5:1</code> at the end of the CFI.
    </p>
  </DocsSection>

  <DocsSection title={TRIPLE_CLICK_SECTIONS.collapse}>
    <p class="prose">
      In a <a href={EPUB_CFI_HREF}>CFI</a> path, an even step is an element (the eighth child
      element is <code>/16</code>) and an odd step is the text between elements. foliate-js, which
      renders EPUBs in Dokseo, writes each step with <code>partToString</code>:
    </p>
    <DocsCode label={PART_TO_STRING.label} code={PART_TO_STRING.code} />
    <p class="prose">
      The <code>index % 2</code> test writes an offset only after an odd, text step. An element step drops
      its offset.
    </p>
    <StepList>
      <StepItem title="Firefox's range">
        <code>(p, 0)</code> to <code>(p, 1)</code>, with the eighth paragraph of the chapter body.
      </StepItem>
      <StepItem title="Each edge becomes a path">
        Both are <code>/4/16</code>: the body, then the paragraph. The offsets 0 and 1 belong to an
        even step, so neither is written.
      </StepItem>
      <StepItem title="The shared steps move to the front">
        <code>epubcfi(/6/12!/4,/16,/16)</code>. The range resolves to one point, so there is nothing
        to draw.
      </StepItem>
    </StepList>
    <p class="prose">
      Going there still turned to the right page, which hid the fault: <code>goToPassage</code>
      returned the CFI as reached and never searched for the quote.
    </p>
  </DocsSection>

  <DocsSection title={TRIPLE_CLICK_SECTIONS.dokseo}>
    <Figure title={copingTitle}>
      <Diagram
        label={COPING_LABEL}
        width={COPING_WIDTH}
        height={COPING_HEIGHT}
        nodes={COPING_NODES}
        edges={COPING_EDGES}
      />
    </Figure>
    <p class="prose">
      Before a new capture's CFI is built, <code>textEdges</code> moves the start to the first readable
      text at or after it and the end to the last readable text before it, skipping ruby readings, scripts
      and styles. If no text is left, the quote search finds the range instead.
    </p>
    <DocsCode label={TEXT_EDGES.label} code={TEXT_EDGES.code} />
    <DocsCode label={LIFTED_RANGE.label} code={LIFTED_RANGE.code} />
    <p class="prose">
      Captures already stored keep their CFI. <code>collapsedCfi</code> finds one whose start equals its
      end, and Go to passage then searches for the quote even when the CFI lands. When the book opens,
      each collapsed capture's quote is searched once, and the highlight is drawn at the CFI found. Because
      the passage was found by its quote, Go to passage shows the notice that it moved since it was captured.
    </p>
    <DocsCode label={COLLAPSED_CFI.label} code={COLLAPSED_CFI.code} />
    <DocsCode label={STORED_CFI_FIRST.label} code={STORED_CFI_FIRST.code} />
    <p class="prose">
      The rule: build a CFI only from a range whose edges lie in text nodes. The <a
        href={tripleClickSectionHref('demo')}>live demo</a
      > shows both ranges side by side.
    </p>
  </DocsSection>
</DocsPage>
