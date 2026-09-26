<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import CommandItem from '$lib/components/CommandItem.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import TagIcon from '$lib/components/icons/Tag.svelte';
  import type { TagId } from '$lib/shared/ids';
  import { tagsHref } from '$lib/shared/tag-location';
  import type { Tag } from '../../../domain/tag/tag';
  import { tagsInUse } from './document-tags';

  type Props = {
    readonly tags: readonly Tag[];
    readonly counts: ReadonlyMap<TagId, number>;
  };

  let { tags, counts }: Props = $props();

  const MANAGE_TAGS = '/tags/manage';

  let open = $state(false);

  const used = $derived(tagsInUse(tags, counts));
</script>

<Button
  variant="ghost"
  size="sm"
  square
  title="Tags in this book"
  aria-haspopup="dialog"
  onclick={() => (open = true)}
>
  <TagIcon class="btn-icon" />
  <span class="visually-hidden">Tags in this book</span>
</Button>

<Modal bind:open title="Tags in this book" size="sm" body="flush">
  {#if used.length === 0}
    <p class="m-0 px-5 pb-5 text-sm text-muted">No capture in this book carries a tag yet.</p>
  {:else}
    <ul class="col gap-0 list-reset px-3 pb-3" aria-label="Tags in this book">
      {#each used as tag (tag.id)}
        <li>
          <CommandItem
            href={tagsHref(tag.name)}
            hint="{tag.count} {tag.count === 1 ? 'capture' : 'captures'}"
          >
            <Badge colour={tag.colour} quiet dot>{tag.name}</Badge>
          </CommandItem>
        </li>
      {/each}
    </ul>
  {/if}
  {#snippet footer()}
    <Button variant="ghost" href={MANAGE_TAGS}>Manage tags</Button>
  {/snippet}
</Modal>
