<script lang="ts">
  import type { Snippet } from 'svelte';
  import { readQuery } from '$lib/shared/read-query.svelte';
  import { modelStorageQuery } from '../../queries/engine-queries';
  import type { EngineReads } from '../../queries/engine-queries';
  import { shownStorage } from './model-storage';
  import type { ShownStorage } from './model-storage';

  type Props = {
    readonly recognition: EngineReads;
    readonly modelId: string;
    readonly children: Snippet<[ShownStorage]>;
  };

  let { recognition, modelId, children }: Props = $props();

  const storage = readQuery(() => modelStorageQuery(recognition, modelId));
  const shown = $derived(shownStorage(storage.state));
</script>

{@render children(shown)}
