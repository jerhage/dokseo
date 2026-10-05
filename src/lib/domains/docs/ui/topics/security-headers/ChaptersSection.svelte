<script lang="ts">
  import StepItem from '$lib/ui/components/StepItem.svelte';
  import StepList from '$lib/ui/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { SECTIONS, sectionHref } from './sections';

  const SANDBOX = `this.#iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts')`;
</script>

<DocsSection title={SECTIONS.chapters}>
  <p>
    An EPUB file is a ZIP archive of XHTML chapters with their stylesheets, pictures and fonts.
    Dokseo renders it with foliate-js. Opening a chapter goes like this:
  </p>
  <StepList>
    <StepItem title="foliate-js reads the chapter">
      It takes the chapter's markup out of the archive and rewrites each reference to a picture,
      stylesheet or font so it refers to a <code>blob:</code> URL for that file.
    </StepItem>
    <StepItem title="Dokseo sanitizes it">
      foliate-js fires a <code>data</code> event with the markup, and Dokseo runs it through
      DOMPurify in <code>src/lib/domains/flowing/ui/chapter-sanitiser.ts</code>. That removes
      <code>script</code>, <code>iframe</code>, <code>object</code>, <code>embed</code>,
      <code>form</code> and <code>base</code> elements and every event handler attribute.
    </StepItem>
    <StepItem title="foliate-js mints a blob URL">
      The sanitized markup becomes a <code>Blob</code>, and
      <code>URL.createObjectURL</code> gives it a <code>blob:</code> URL on Dokseo's origin.
    </StepItem>
    <StepItem title="The chapter loads in a frame">
      foliate-js sets that URL as the <code>src</code> of an <code>&lt;iframe&gt;</code>, waits for
      <code>load</code>, and then reads and styles the chapter's document.
    </StepItem>
  </StepList>
  <p>
    The frame is a <code>blob:</code> document, so it inherits the page's policies, as shown in
    <a href={sectionHref('frames')}>blob documents inherit the policy</a>. That makes the policy a
    second layer under the sanitizer. If a script ever got past DOMPurify, the copied
    <code>script-src</code> would still block it, inline or from a <code>blob:</code> URL.
  </p>
  <p>foliate-js also sandboxes every chapter frame, in <code>paginator.js</code>:</p>
  <DocsCode label="foliate-js, paginator.js" code={SANDBOX} />
  <p>
    The comment above that line says <code>allow-scripts</code> is there for events, because of
    WebKit bug 218086. <code>allow-same-origin</code> keeps the chapter on Dokseo's origin so the page
    can read and style it. With both tokens the chapter could lift its own sandbox, so the sandbox adds
    little here. The inherited policy is what stops a chapter's script.
  </p>
</DocsSection>
