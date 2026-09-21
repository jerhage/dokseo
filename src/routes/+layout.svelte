<script lang="ts">
  import favicon from '$lib/assets/favicon.svg';
  import { buildContainer } from '$lib/container';
  import { provideContainer } from '$lib/context';
  import {
    canRunHere,
    featuresOf,
    SUPPORT_TABLE_LABEL,
    SUPPORT_TABLE_URL,
    UNSUPPORTED_NOTICE,
  } from '$lib/shared/browser-support';
  import '$lib/styles/tokens.css';

  let { children } = $props();

  provideContainer(buildContainer());

  const supported = canRunHere(featuresOf(globalThis));
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{#if !supported}
  <p class="unsupported" role="alert">
    {UNSUPPORTED_NOTICE}
    <a href={SUPPORT_TABLE_URL} target="_blank" rel="noreferrer">{SUPPORT_TABLE_LABEL}</a>
  </p>
{/if}

{@render children()}

<style>
  :global(body) {
    margin: 0;
    background: var(--c-surface-app);
  }

  .unsupported {
    margin: 0;
    padding: var(--s-3) var(--s-4);
    border-bottom: 1px solid var(--c-accent-border);
    background: var(--c-accent-wash-faint);
    color: var(--c-text-2);
    font-family: var(--f-ui);
    font-size: 12.5px;
    text-align: center;
  }

  .unsupported a {
    color: var(--c-accent);
  }
</style>
