<script lang="ts">
  import type { BookId } from '$lib/shared/ids';
  import { openFlowSurface } from './flow-surface';
  import type { FlowView } from './flow-view.svelte';

  type Props = {
    readonly view: FlowView;
    readonly book: BookId;
  };

  const { view, book }: Props = $props();

  let stage = $state<HTMLElement | null>(null);

  const curtain = $derived(view.curtain);
  const message = $derived(curtain.kind === 'notice' ? curtain.message : null);

  $effect(() => {
    const host = stage;
    const id = book;
    if (host === null) return;

    void view.open(id, (source) => openFlowSurface(host, source));
    return () => {
      view.close();
    };
  });
</script>

<div class="screen">
  <div class="stage" bind:this={stage}></div>

  {#if curtain.kind === 'opening'}
    <div class="curtain">
      <p class="notice" aria-live="polite">Opening this book…</p>
    </div>
  {:else if message !== null}
    <div class="curtain">
      <p class="notice" aria-live="polite">{message}</p>
      <a class="escape" href="/">Back to your library</a>
    </div>
  {/if}
</div>

<style>
  .screen {
    position: relative;
    height: 100vh;
    background: var(--c-surface-void);
    color: var(--c-text-2);
    font-family: var(--f-ui);
  }

  .stage {
    height: 100%;
  }

  .stage :global(foliate-view) {
    display: block;
    width: 100%;
    height: 100%;
  }

  .curtain {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--s-3);
    padding: var(--s-5);
    background: var(--c-viewer-gradient);
  }

  .notice {
    max-width: 44ch;
    margin: 0;
    color: var(--c-text-7);
    font-size: 12.5px;
    text-align: center;
  }

  .escape {
    padding: var(--s-2) var(--s-3);
    border-radius: var(--r-4);
    background: var(--c-accent);
    color: var(--c-accent-text);
    font-size: 12px;
    font-weight: 600;
    text-decoration: none;
  }
</style>
