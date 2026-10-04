<script lang="ts">
  import CodeBlock from '$lib/components/CodeBlock.svelte';
  import DemoSection from './DemoSection.svelte';

  const HEADERS = `Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp`;

  let copied = $state(false);

  function copy(text: string): void {
    void navigator.clipboard.writeText(text).then(() => (copied = true));
  }
</script>

<DemoSection
  id="codeblock"
  title="Code block"
  classes={['codeblock', 'codeblock-frame', 'codeblock-copy']}
>
  <p class="text-sm text-muted">
    Monospace on the code surface, scrolling sideways when a line is long. Given
    <code>oncopy</code>, it draws a copy button that reports the text, and shows
    <code>copied</code> as a check.
  </p>
  <div class="grid-2">
    <CodeBlock label="Plain" code="@layer reset, base, tokens, components;" />
    <CodeBlock label="Copyable" code={HEADERS} oncopy={copy} {copied} />
  </div>
</DemoSection>
