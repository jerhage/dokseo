<script lang="ts">
  import Badge from '$lib/ui/components/Badge.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import IconButton from '$lib/ui/components/IconButton.svelte';
  import CommandItem from '$lib/ui/components/CommandItem.svelte';
  import EmptyState from '$lib/ui/components/EmptyState.svelte';
  import Modal from '$lib/ui/components/Modal.svelte';
  import TagIcon from '$lib/ui/components/icons/Tag.svelte';
  import type { TagId } from '$lib/shared/ids';
  import { tagsHref } from '$lib/shared/tag-location';
  import type { Tag } from '../../domain/tag/tag';
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

<IconButton
  variant="ghost"
  size="sm"
  aria-haspopup="dialog"
  icon={TagIcon}
  label="Tags in this book"
  onclick={() => (open = true)}
/>

<Modal bind:open title="Tags in this book" size="sm" flushBody>
  {#if used.length === 0}
    <EmptyState class="px-5 pb-5" message="No capture in this book carries a tag yet." />
  {:else}
    <ul class="col gap-0 list-reset px-3 pb-3" aria-label="Tags in this book">
      {#each used as tag (tag.id)}
        <li>
          <CommandItem
            href={tagsHref(tag.name)}
            hint="{tag.count} {tag.count === 1 ? 'capture' : 'captures'}"
          >
            <Badge color={tag.colour} emphasis="quiet" dot>{tag.name}</Badge>
          </CommandItem>
        </li>
      {/each}
    </ul>
  {/if}
  {#snippet footer()}
    <Button variant="ghost" href={MANAGE_TAGS}>Manage tags</Button>
  {/snippet}
</Modal>
