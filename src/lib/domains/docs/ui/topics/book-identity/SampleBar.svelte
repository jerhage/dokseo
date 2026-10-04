<script lang="ts">
  import { sampleSpans } from './identity-demos';
  import { byteCount } from './identity-text';
  import './book-identity.css';

  type Props = { size: number };

  let { size }: Props = $props();

  const read = $derived(sampleSpans(size).filter((span) => span.kind === 'read'));
</script>

<div class="identity-sample-bar stack-sm">
  <div
    class="bar relative bordered rounded-control surface-sunken"
    role="img"
    aria-label="{read.length} samples across a file of {byteCount(size)}"
  >
    {#each read as span (span.offset)}
      <span
        class="sample place-rect"
        style:--rect-left="{(span.offset / size) * 100}%"
        style:--rect-top="0%"
        style:--rect-height="100%"
        style:--rect-width="{(span.length / size) * 100}%"
      ></span>
    {/each}
  </div>
  <div class="row justify-between text-xs text-muted">
    <span>0</span>
    <span>{byteCount(size)}</span>
  </div>
</div>
