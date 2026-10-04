<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query';
  import Alert from '$lib/components/Alert.svelte';
  import Button from '$lib/components/Button.svelte';
  import { writeQuery } from '$lib/shared/write-query.svelte';
  import type { UnreadableCapture } from '../../domain/capture/capture';
  import { removeUnreadableCapturesMutation } from '../../queries/capture-queries';
  import type { CaptureWrites } from '../../queries/capture-queries';
  import { recognitionKeys } from '../../queries/recognition-keys';
  import {
    removalProblem,
    removeUnreadableLabel,
    unreadableCapturesTitle,
  } from './unreadable-captures';
  import type { UnreadableRowsExporting } from './unreadable-rows-export.svelte';
  import UnreadableRowsExportButton from './UnreadableRowsExportButton.svelte';

  type Props = {
    readonly captures: readonly UnreadableCapture[];
    readonly recognition: Pick<CaptureWrites, 'removeUnreadableCaptures'> & UnreadableRowsExporting;
  };

  let { captures, recognition }: Props = $props();

  const client = useQueryClient();

  const removal = writeQuery(() => ({
    ...removeUnreadableCapturesMutation(recognition),
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: recognitionKeys.everyCapture() }),
        client.invalidateQueries({ queryKey: recognitionKeys.bookCaptures() }),
      ]),
  }));

  const problem = $derived(removalProblem(removal.state));
</script>

{#if captures.length > 0}
  <Alert variant="warning" title={unreadableCapturesTitle(captures.length)}>
    These captures were stored in a shape this version cannot read.
    <UnreadableRowsExportButton rows={{ captures, tags: [] }} exporting={recognition} />
    {#if problem !== null}
      <p>{problem}</p>
    {/if}
    {#snippet actions()}
      <Button
        size="sm"
        variant="danger"
        disabled={removal.state.kind === 'saving'}
        onclick={() => removal.submit(captures.map((capture) => capture.id))}
        >{removeUnreadableLabel(captures.length)}</Button
      >
    {/snippet}
  </Alert>
{/if}
