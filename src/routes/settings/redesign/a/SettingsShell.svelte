<script lang="ts">
  import type { Snippet } from 'svelte';
  import Button from '$lib/components/Button.svelte';
  import NavLink from '$lib/components/NavLink.svelte';

  type Section = 'engine' | 'storage';

  type Props = {
    readonly current: Section;
    readonly root?: string;
    readonly aside?: Snippet;
    readonly children: Snippet;
  };

  let { current, root = '/settings', aside, children }: Props = $props();

  const sections: readonly {
    readonly id: Section;
    readonly name: string;
    readonly href: string;
  }[] = $derived([
    { id: 'engine', name: 'OCR engine', href: root },
    { id: 'storage', name: 'Storage', href: `${root}/storage` },
  ]);
</script>

<div class="layout-app-shell">
  <nav class="layout-app-shell-nav wrap" aria-label="Settings">
    <div class="row items-center gap-2 px-2 pb-4">
      <Button href="/" variant="primary" size="sm" square aria-label="Your library">
        <span lang="ja" aria-hidden="true">読</span>
      </Button>
      <span class="text-sm text-muted">Settings</span>
    </div>
    {#each sections as section (section.id)}
      <NavLink href={section.href} current={section.id === current}>{section.name}</NavLink>
    {/each}
    <div class="flex-1"></div>
    {#if aside !== undefined}
      {@render aside()}
    {/if}
    <Button href="/" variant="outline" size="sm" block class="mt-3">Back to your library</Button>
  </nav>

  <main class="layout-main-area p-0 gap-0">
    {@render children()}
  </main>
</div>
