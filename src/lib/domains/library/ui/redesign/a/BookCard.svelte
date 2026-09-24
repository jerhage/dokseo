<script lang="ts">
  import { tick } from 'svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Progress from '$lib/components/Progress.svelte';
  import type { BookId } from '$lib/shared/ids';
  import type { Book } from '../../../domain/book/book';
  import { bookContents, describeBookContents } from '../../../domain/book/book-contents';
  import { bookProgress } from '../../../domain/book/book-progress';

  type Props = {
    readonly book: Book;
    readonly cover: string | null;
    readonly onremove: (id: BookId) => void;
    readonly removing: boolean;
    readonly onedit: (id: BookId) => void;
    readonly editing: boolean;
  };

  let { book, cover, onremove, removing, onedit, editing }: Props = $props();

  let confirming = $state(false);
  let removeTrigger = $state<HTMLButtonElement>();

  const busy = $derived(removing || editing);
  const progress = $derived(bookProgress(book));
  const contents = $derived(describeBookContents(bookContents(book)));

  async function cancel(): Promise<void> {
    confirming = false;
    await tick();
    removeTrigger?.focus();
  }
</script>

<article class={['reveal-host col gap-2', { 'is-busy': busy }]} aria-busy={busy}>
  <div
    class="overlay-host aspect-portrait overflow-hidden surface-sunken bordered rounded-container"
  >
    <a class="overlay-fill" href="/read/{book.id}" aria-label="Read {book.title}">
      {#if cover !== null}
        <img class="object-cover" src={cover} alt="" />
      {/if}
    </a>

    {#if !confirming}
      <div class="overlay-top-end reveal-on-hover row gap-1">
        <Button size="sm" square pill disabled={busy} onclick={() => onedit(book.id)}>
          <span aria-hidden="true">✎</span>
          <span class="visually-hidden">Edit {book.title}</span>
        </Button>
        <Button
          bind:ref={removeTrigger}
          size="sm"
          square
          pill
          disabled={busy}
          onclick={() => (confirming = true)}
        >
          <span aria-hidden="true">×</span>
          <span class="visually-hidden">Remove {book.title}</span>
        </Button>
      </div>
    {/if}

    {#if progress.kind === 'known'}
      <div class="overlay-bottom overlay-pass-through col items-start gap-2 p-2">
        <Badge variant="brand" dot>{progress.label}</Badge>
        <Progress label="Read so far in {book.title}" value={progress.filled} size="sm" />
      </div>
    {/if}

    {#if confirming}
      <div class="overlay-fill surface col items-center justify-center gap-3 p-3">
        <p class="text-sm">Remove this upload?</p>
        <div class="row wrap gap-2">
          <Button size="sm" variant="danger" disabled={busy} onclick={() => onremove(book.id)}>
            {removing ? 'Removing…' : 'Remove'}
          </Button>
          <Button size="sm" disabled={busy} onclick={() => void cancel()}>Cancel</Button>
        </div>
      </div>
    {/if}
  </div>
  <h3 class="text-sm weight-normal truncate" lang={book.language}>{book.title}</h3>
  <p class="text-xs text-muted">{contents}</p>
</article>
