<script lang="ts">
  import type { Snippet } from 'svelte';
  import Badge from '$lib/ui/components/Badge.svelte';
  import Breadcrumb from '$lib/ui/components/Breadcrumb.svelte';
  import TableOfContents from '$lib/ui/components/TableOfContents.svelte';
  import { contentsEntries } from '$lib/ui/components/table-of-contents';
  import { DOCS_ROOT, docsTopic, docsTopicStanding } from '../domain/topics';
  import type { DocsTopicSlug } from '../domain/topics';

  type Props = {
    slug: DocsTopicSlug;
    sections: readonly string[];
    lead?: Snippet;
    children: Snippet;
  };

  let { slug, sections, lead, children }: Props = $props();

  const topic = $derived(docsTopic(slug));
  const standing = $derived(docsTopicStanding(topic));
  const entries = $derived(contentsEntries(sections.map((title) => ({ title }))));
</script>

<svelte:head>
  <title>{topic.title} · Docs</title>
</svelte:head>

<article class="stack-lg">
  <header class="stack-sm">
    <Breadcrumb items={[{ label: 'Docs', href: DOCS_ROOT }, { label: topic.title }]} />
    <h1>{topic.title}</h1>
    {#if standing !== null}
      <p class="row items-center gap-2 m-0 text-muted">
        <Badge variant="accent">Plan</Badge>{standing}
      </p>
    {/if}
    {#if lead !== undefined}
      <p class="text-lg text-muted prose">{@render lead()}</p>
    {/if}
  </header>
  <div class="layout-sidebar">
    <aside class="layout-sidebar-aside">
      <TableOfContents {entries} />
    </aside>
    <div class="layout-sidebar-content">
      {@render children()}
    </div>
  </div>
</article>
