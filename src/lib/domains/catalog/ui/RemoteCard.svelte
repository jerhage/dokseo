<script lang="ts">
  import Card from '$lib/ui/components/Card.svelte';
  import Checkbox from '$lib/ui/components/Checkbox.svelte';
  import Thumbnail from '$lib/ui/components/Thumbnail.svelte';
  import type { BookId } from '$lib/shared/ids';
  import type { RemoteItem } from '../domain/remote-item';
  import { isSelectable } from './catalog-selection.svelte';
  import RemoteActions from './RemoteActions.svelte';

  type Props = {
    readonly item: RemoteItem;
    readonly cover: string | null;
    readonly selected: boolean;
    readonly readerHref: (id: BookId) => string;
    readonly ondownload: () => void;
    readonly oncancel: () => void;
    readonly onreplace: () => void;
    readonly ontoggle: () => void;
    readonly ondetails: () => void;
  };

  let {
    item,
    cover,
    selected,
    readerHref,
    ondownload,
    oncancel,
    onreplace,
    ontoggle,
    ondetails,
  }: Props = $props();

  const publication = $derived(item.publication);
  const authors = $derived(publication.authors.join(', '));
  const lang = $derived(publication.language ?? undefined);
  const selectable = $derived(isSelectable(item));
</script>

<li class="col gap-2">
  <div class="relative">
    <Card
      mediaRatio="portrait"
      aria-label={publication.title}
      variant={selected ? 'feature' : 'default'}
      onclick={ondetails}
    >
      {#snippet media()}
        <Thumbnail src={cover} fill />
      {/snippet}
    </Card>
    {#if selectable}
      <div class="card-overlay">
        <Checkbox checked={selected} onchange={ontoggle}>
          <span class="visually-hidden">Select {publication.title}</span>
        </Checkbox>
      </div>
    {/if}
  </div>
  <div class="col gap-1">
    <h3 class="text-sm weight-medium truncate" title={publication.title} {lang}>
      {publication.title}
    </h3>
    {#if authors !== ''}
      <p class="text-xs text-muted truncate" title={authors}>{authors}</p>
    {/if}
  </div>
  <RemoteActions {item} {readerHref} {ondownload} {oncancel} {onreplace} />
</li>
