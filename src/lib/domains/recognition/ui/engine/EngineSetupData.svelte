<script lang="ts">
  import type { Snippet } from 'svelte';
  import Alert from '$lib/ui/components/Alert.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import EmptyState from '$lib/ui/components/EmptyState.svelte';
  import Skeleton from '$lib/ui/components/Skeleton.svelte';
  import type { Language } from '$lib/shared/language';
  import { readQuery } from '$lib/shared/read-query.svelte';
  import { readBoth } from '$lib/shared/read-state';
  import { unreachable } from '$lib/shared/unreachable';
  import { computeQuery, recognizerSetupQuery, setupState } from '../../queries/engine-queries';
  import type { EngineReads } from '../../queries/engine-queries';
  import { engineChoiceOf } from './engine-setup';
  import type { EngineChoice } from './engine-setup';

  type Props = {
    readonly recognition: EngineReads;
    readonly language: Language;
    readonly children: Snippet<[EngineChoice]>;
  };

  let { recognition, language, children }: Props = $props();

  const setup = readQuery(() => recognizerSetupQuery(recognition, language));
  const compute = readQuery(() => computeQuery(recognition));
  const state = $derived(readBoth(setupState(setup.state), compute.state, engineChoiceOf));

  function retry(): void {
    setup.reload();
    compute.reload();
  }
</script>

{#if state.kind === 'loading'}
  <div class="surface bordered rounded-container col gap-3 p-5" aria-busy="true">
    <EmptyState live message="Reading your engine settings…" />
    <Skeleton shape="title" width="40%" />
    <Skeleton shape="text" />
    <Skeleton shape="text" width="70%" />
  </div>
{:else if state.kind === 'failed'}
  <Alert variant="danger" title="Engine settings could not be read">
    {state.message}
    {#snippet actions()}
      <Button size="sm" onclick={retry}>Try again</Button>
    {/snippet}
  </Alert>
{:else if state.kind === 'ready'}
  {@render children(state.value)}
{:else}
  {unreachable(state)}
{/if}
