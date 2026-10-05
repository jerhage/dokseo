<script lang="ts">
  import CodeBlock from '../components/CodeBlock.svelte';
  import DemoSection from './DemoSection.svelte';

  const HEADERS = `Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp`;

  const MESSAGE = `src/example.ts(4,7): error TS2322: Type '"ko"' is not assignable to type 'Language'. A long line like this one wraps at the edge of the block instead of scrolling sideways.`;

  let copied = $state(false);

  function copy(text: string): void {
    void navigator.clipboard.writeText(text).then(() => (copied = true));
  }
</script>

<DemoSection
  id="codeblock"
  title="Code block"
  classes={['codeblock', 'codeblock-wrap', 'codeblock-frame', 'codeblock-copy']}
>
  <p class="text-sm text-muted">
    Monospace on the code surface, scrolling sideways when a line is long. Given
    <code>oncopy</code>, it draws a copy button that reports the text, and shows
    <code>copied</code> as a check. Given <code>wrap</code>, a long line wraps instead.
  </p>
  <div class="grid-2">
    <CodeBlock label="Plain" code="@layer reset, base, tokens, components;" />
    <CodeBlock label="Copyable" code={HEADERS} oncopy={copy} {copied} />
  </div>
  <CodeBlock label="Wrapping" code={MESSAGE} wrap />
</DemoSection>
