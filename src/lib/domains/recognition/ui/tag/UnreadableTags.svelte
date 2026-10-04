<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query';
  import Alert from '$lib/components/Alert.svelte';
  import Button from '$lib/components/Button.svelte';
  import ListGroup from '$lib/components/ListGroup.svelte';
  import ListRow from '$lib/components/ListRow.svelte';
  import type { TagId } from '$lib/shared/ids';
  import { writeQuery } from '$lib/shared/write-query.svelte';
  import type { UnreadableTag } from '../../domain/tag/tag';
  import type { UnreadableRowsExporting } from '../capture/unreadable-rows-export.svelte';
  import UnreadableRowsExportButton from '../capture/UnreadableRowsExportButton.svelte';
  import { recognitionKeys } from '../../queries/recognition-keys';
  import { removeUnreadableTagsMutation } from '../../queries/tag-queries';
  import type { TagWrites } from '../../queries/tag-queries';
  import { tagRemovalProblem, unreadableTagName, unreadableTagsTitle } from './unreadable-tags';

  type Props = {
    readonly tags: readonly UnreadableTag[];
    readonly recognition: Pick<TagWrites, 'removeUnreadableTags'> & UnreadableRowsExporting;
  };

  let { tags, recognition }: Props = $props();

  const client = useQueryClient();

  const removal = writeQuery(() => ({
    ...removeUnreadableTagsMutation(recognition),
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: recognitionKeys.tags() }),
        client.invalidateQueries({ queryKey: recognitionKeys.everyCapture() }),
        client.invalidateQueries({ queryKey: recognitionKeys.bookCaptures() }),
      ]),
  }));

  const problem = $derived(tagRemovalProblem(removal.state));
  const busy = $derived(removal.state.kind === 'saving');

  function remove(ids: readonly TagId[]): void {
    removal.submit(ids);
  }
</script>

{#if tags.length > 0}
  <Alert variant="warning" title={unreadableTagsTitle(tags.length)}>
    <p>
      These tags were stored in a shape this version cannot read. Remove them to clear this notice.
      Removing a tag takes it off every capture that carries it.
    </p>
    <UnreadableRowsExportButton rows={{ captures: [], tags }} exporting={recognition} />
    {#if problem !== null}
      <p>{problem}</p>
    {/if}
    <ListGroup variant="inset">
      {#each tags as tag (tag.id)}
        <ListRow title={unreadableTagName(tag)} size="sm">
          {#snippet actions()}
            <Button size="sm" variant="outline" disabled={busy} onclick={() => remove([tag.id])}
              >Remove</Button
            >
          {/snippet}
        </ListRow>
      {/each}
    </ListGroup>
    {#snippet actions()}
      <Button
        size="sm"
        variant="danger"
        disabled={busy}
        onclick={() => remove(tags.map((tag) => tag.id))}>Remove all</Button
      >
    {/snippet}
  </Alert>
{/if}
