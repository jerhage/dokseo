<script lang="ts">
  import type { Snippet } from 'svelte';
  import Badge from '$lib/ui/components/Badge.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Modal from '$lib/ui/components/Modal.svelte';
  import Progress from '$lib/ui/components/Progress.svelte';
  import Thumbnail from '$lib/ui/components/Thumbnail.svelte';
  import type { BookId } from '$lib/shared/ids';
  import { unreachable } from '$lib/shared/unreachable';
  import type { Book } from '../domain/book/book';
  import type { BookAction, BookDetails } from './book-details';

  type Props = {
    readonly book: Book;
    readonly details: BookDetails;
    readonly cover: string | null;
    readonly busy: boolean;
    readonly onedit: (id: BookId) => void;
    readonly onremove: (id: BookId) => void;
    readonly onfinish: (id: BookId) => void;
    readonly onunread: (id: BookId) => void;
    readonly onclose: () => void;
    readonly bookSource?: Snippet<[BookId]> | undefined;
  };

  let {
    book,
    details,
    cover,
    busy,
    onedit,
    onremove,
    onfinish,
    onunread,
    onclose,
    bookSource,
  }: Props = $props();

  let open = $state(true);

  const ACTION_NAMES: Readonly<Record<BookAction, string>> = {
    finish: 'Mark as finished',
    unread: 'Mark as unread',
    edit: 'Book settings…',
    remove: 'Remove…',
  };

  function act(action: BookAction): void {
    const id = book.id;
    onclose();
    if (action === 'finish') onfinish(id);
    else if (action === 'unread') onunread(id);
    else if (action === 'edit') onedit(id);
    else onremove(id);
  }
</script>

<Modal bind:open title={details.title} size="sm" sheetNarrow {onclose}>
  <div class="stack-md">
    <div class="row">
      <Thumbnail src={cover} size="lg" bordered />
    </div>
    {#if details.progress.kind === 'finished'}
      <div class="row">
        <Badge variant="success">Finished</Badge>
      </div>
    {:else if details.progress.kind === 'known'}
      <div class="col gap-1">
        <span class="text-xs mono">{details.progress.label}</span>
        <Progress
          label="Read so far in {details.title}"
          value={details.progress.filled}
          size="sm"
        />
      </div>
    {:else if details.progress.kind === 'unknown'}
      <span class="text-xs text-faint">Unknown</span>
    {:else}
      {unreachable(details.progress)}
    {/if}
    <p class="text-sm text-muted">{details.facts}</p>
    {@render bookSource?.(book.id)}
    <div class="row items-center gap-2 wrap">
      <Button variant="primary" href="/read/{book.id}">{details.readLabel}</Button>
      {#if details.actions.includes('edit')}
        <Button disabled={busy} onclick={() => act('edit')}>{ACTION_NAMES.edit}</Button>
      {/if}
    </div>
    <div class="row items-center gap-2 wrap">
      {#each details.actions.filter((action) => action !== 'edit') as action (action)}
        <Button
          variant={action === 'remove' ? 'ghost-danger' : 'default'}
          disabled={busy}
          onclick={() => act(action)}>{ACTION_NAMES[action]}</Button
        >
      {/each}
    </div>
  </div>
</Modal>
