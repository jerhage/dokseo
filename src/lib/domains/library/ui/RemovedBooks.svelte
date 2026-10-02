<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import ListGroup from '$lib/components/ListGroup.svelte';
  import ListRow from '$lib/components/ListRow.svelte';
  import type { BookId } from '$lib/shared/ids';
  import { entryId } from '../domain/book/removed-book';
  import type { RemovedShelfEntry } from '../domain/book/removed-book';
  import { removedEntryDescription, removedEntryName } from './removed-books';

  type Props = {
    readonly entries: readonly RemovedShelfEntry[];
    readonly busy: boolean;
    readonly ondelete: (id: BookId) => void;
  };

  let { entries, busy, ondelete }: Props = $props();
</script>

<ListGroup title="Removed books" variant="inset">
  {#each entries as entry (entryId(entry))}
    <ListRow title={removedEntryName(entry)} description={removedEntryDescription(entry)} size="sm">
      {#snippet actions()}
        <Button size="sm" variant="outline" disabled={busy} onclick={() => ondelete(entryId(entry))}
          >Delete captures</Button
        >
      {/snippet}
    </ListRow>
  {/each}
</ListGroup>
