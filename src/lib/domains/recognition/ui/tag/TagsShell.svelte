<script lang="ts">
  import type { Snippet } from 'svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Breadcrumb from '$lib/components/Breadcrumb.svelte';
  import Button from '$lib/components/Button.svelte';
  import TagIcon from '$lib/components/icons/Tag.svelte';
  import Input from '$lib/components/Input.svelte';
  import { keyboardScrolling } from '$lib/components/keyboard-scrolling';
  import Modal from '$lib/components/Modal.svelte';
  import NavLink from '$lib/components/NavLink.svelte';
  import { tagsHref } from '$lib/shared/tag-location';
  import { tagsCrumbs } from './tags-crumbs';
  import type { TagsPlace } from './tags-crumbs';
  import type { TagView } from './tag-view.svelte';

  type Props = {
    readonly view: TagView;
    readonly current: TagsPlace;
    readonly children: Snippet<[() => void]>;
  };

  let { view, current, children }: Props = $props();

  const uid = $props.id();

  let listing = $state(false);

  const crumbs = $derived(tagsCrumbs(current));

  function showList(): void {
    listing = true;
  }
</script>

{#snippet tagList(where: 'nav' | 'sheet')}
  {#if where === 'nav'}
    <div class="row items-center justify-between gap-2 px-3">
      <h2 class="text-sm weight-semibold">Tags</h2>
      <Badge>{view.tags.length}</Badge>
    </div>
  {/if}
  <label class="visually-hidden" for="{uid}-{where}-filter">Filter tags</label>
  <Input
    id="{uid}-{where}-filter"
    type="search"
    placeholder="Filter tags"
    bind:value={view.filter}
  />
  <ul class="list-reset col gap-1">
    {#each view.column as option (option.tag.id)}
      <li>
        <NavLink
          href={tagsHref(option.tag.name)}
          title={option.tag.name}
          current={current === 'tags' && option.tag.id === view.chosen}
          onclick={() => (listing = false)}
        >
          {#snippet icon()}
            <Badge colour={option.tag.colour} quiet dot />
          {/snippet}
          <span class="truncate flex-1">{option.tag.name}</span>
          <span class="text-xs mono text-faint">{option.count}</span>
        </NavLink>
      </li>
    {/each}
  </ul>
  <div class="border-t pt-2">
    <NavLink href="/tags/manage" current={current === 'manage'} onclick={() => (listing = false)}>
      Manage tags
    </NavLink>
  </div>
{/snippet}

<div class="layout-app-shell">
  <header class="layout-app-shell-header layout-app-shell-narrow-nowrap">
    <div class="row items-center gap-3 min-w-0">
      <Button href="/" variant="primary" size="sm" square aria-label="Your library">
        <span lang="ja" aria-hidden="true">読</span>
      </Button>
      <Breadcrumb items={crumbs} label="You are here" class="min-w-0" />
    </div>
    <div class="row items-center gap-1 shrink-0">
      <Button
        variant="ghost"
        size="sm"
        square
        class="layout-app-shell-narrow-only"
        aria-label="Choose a tag"
        aria-haspopup="dialog"
        onclick={showList}
      >
        <TagIcon class="btn-icon" />
      </Button>
      <Button href="/settings" variant="ghost" size="sm" title="OCR engine settings"
        >Settings</Button
      >
    </div>
  </header>

  <nav class="layout-app-shell-nav layout-app-shell-wide-only gap-2" aria-label="Tags">
    {@render tagList('nav')}
  </nav>

  <main class="layout-main-area" tabindex="-1" {@attach keyboardScrolling}>
    {@render children(showList)}
  </main>
</div>

<Modal bind:open={listing} title="Tags" size="sm" placement="top">
  <div class="col gap-2">
    {@render tagList('sheet')}
  </div>
</Modal>
