<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Card from '$lib/components/Card.svelte';
  import { DOCS_TOPICS, docsIndexEntries } from '../domain/topics';

  const entries = docsIndexEntries(DOCS_TOPICS);
</script>

<svelte:head>
  <title>Docs</title>
</svelte:head>

<div class="stack-lg">
  <header class="stack-sm prose">
    <h1>How Dokseo works</h1>
    <p class="text-lg text-muted">
      Each topic explains a concept first, then shows how Dokseo implements it, with live demos
      built from the app's own components and code.
    </p>
  </header>
  <ol class="grid-auto list-reset">
    {#each entries as entry (entry.topic.slug)}
      <li class="col">
        {#if entry.kind === 'link'}
          <Card href={entry.href} heading="h2" class="flex-1">
            {#snippet title()}{entry.topic.title}{/snippet}
            {#snippet description()}{entry.topic.summary}{/snippet}
          </Card>
        {:else}
          <Card heading="h2" class="flex-1">
            {#snippet title()}{entry.topic.title}{/snippet}
            {#snippet description()}{entry.topic.summary}{/snippet}
            <div class="row"><Badge>Coming</Badge></div>
          </Card>
        {/if}
      </li>
    {/each}
  </ol>
</div>
