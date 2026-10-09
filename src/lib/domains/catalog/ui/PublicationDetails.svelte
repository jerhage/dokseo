<script lang="ts">
  import { onDestroy } from 'svelte';
  import Modal from '$lib/ui/components/Modal.svelte';
  import Thumbnail from '$lib/ui/components/Thumbnail.svelte';
  import type { BookId } from '$lib/shared/ids';
  import type { OpenedPublication } from './remote-details';
  import RemoteActions from './RemoteActions.svelte';

  type Props = {
    readonly opened: OpenedPublication;
    readonly readerHref: (id: BookId) => string;
    readonly onclose: () => void;
    readonly ongone: () => void;
    readonly ondownload: () => void;
    readonly oncancel: () => void;
    readonly onreplace: () => void;
  };

  let { opened, readerHref, onclose, ongone, ondownload, oncancel, onreplace }: Props = $props();

  let open = $state(true);

  onDestroy(() => ongone());
</script>

<Modal bind:open title={opened.publication.title} size="sm" sheetNarrow {onclose}>
  <div class="stack-md">
    <div class="row">
      <Thumbnail src={opened.cover} size="lg" bordered />
    </div>
    {#if opened.facts.length > 0}
      <dl class="stack-sm text-sm">
        {#each opened.facts as fact (fact.label)}
          <div class="row gap-2">
            <dt class="text-muted">{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        {/each}
      </dl>
    {/if}
    {#if opened.summary.length > 0}
      <div class="stack-sm text-sm">
        {#each opened.summary as line, at (at)}
          <p>{line}</p>
        {/each}
      </div>
    {/if}
    <RemoteActions item={opened.item} {readerHref} {ondownload} {oncancel} {onreplace} />
  </div>
</Modal>
