<script lang="ts">
  import type { Snippet } from 'svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import Breadcrumb from '$lib/components/Breadcrumb.svelte';
  import Button from '$lib/components/Button.svelte';
  import NavLink from '$lib/components/NavLink.svelte';
  import { settingsSections } from './settings-sections';
  import type { SettingsSection } from './settings-sections';

  type Props = {
    readonly current: SettingsSection;
    readonly root?: string;
    readonly flush?: boolean;
    readonly aside?: Snippet;
    readonly children: Snippet;
  };

  let { current, root = '/settings', flush = false, aside, children }: Props = $props();

  const sections = $derived(settingsSections(root));
  const shown = $derived(sections.find((section) => section.id === current));
  const crumbs = $derived([
    { label: 'Library', href: '/' },
    { label: 'Settings', href: root },
    { label: shown?.name ?? 'Settings' },
  ]);
</script>

<div class="layout-app-shell">
  <header class="layout-app-shell-header wrap">
    <div class="row items-center gap-3">
      <Button href="/" variant="primary" size="sm" square aria-label="Your library">
        <span lang="ja" aria-hidden="true">読</span>
      </Button>
      <Breadcrumb items={crumbs} label="You are here" />
    </div>
  </header>

  <nav class="layout-app-shell-nav wrap" aria-label="Settings">
    {#each sections as section (section.id)}
      <NavLink href={section.href} current={section.id === current} class="py-2">
        {#snippet icon()}
          <Avatar shape="square" size="sm">{section.glyph}</Avatar>
        {/snippet}
        <span class="col gap-0">
          <span>{section.name}</span>
          <span class="text-xs text-faint weight-normal">{section.summary}</span>
        </span>
      </NavLink>
    {/each}
    <div class="flex-1"></div>
    {#if aside !== undefined}
      {@render aside()}
    {/if}
  </nav>

  <main class={['layout-main-area', { 'p-0 gap-0': flush }]}>
    {@render children()}
  </main>
</div>
