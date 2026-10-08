<script lang="ts">
  import Modal from '$lib/ui/components/Modal.svelte';
  import Thumbnail from '$lib/ui/components/Thumbnail.svelte';
  import type { BookId } from '$lib/shared/ids';
  import type { CatalogBrowseView } from './catalog-browse.svelte';
  import RemoteActions from './RemoteActions.svelte';

  type Props = {
    readonly view: CatalogBrowseView;
    readonly readerHref: (id: BookId) => string;
  };

  let { view, readerHref }: Props = $props();

  let open = $state(true);

  const opened = $derived(view.opened);
</script>

{#if opened !== null}
  <Modal
    bind:open
    title={opened.publication.title}
    size="sm"
    sheetNarrow
    onclose={() => view.closeDetails()}
  >
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
      {#if opened.publication.summary !== ''}
        <p class="text-sm">{opened.publication.summary}</p>
      {/if}
      <RemoteActions
        item={opened.item}
        {readerHref}
        ondownload={() => view.downloadOpened()}
        oncancel={() => view.cancelOpened()}
        onreplace={() => view.replaceOpened()}
      />
    </div>
  </Modal>
{/if}
