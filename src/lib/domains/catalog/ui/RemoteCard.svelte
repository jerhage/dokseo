<script lang="ts">
  import Badge from '$lib/ui/components/Badge.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Card from '$lib/ui/components/Card.svelte';
  import Progress from '$lib/ui/components/Progress.svelte';
  import Thumbnail from '$lib/ui/components/Thumbnail.svelte';
  import { unreachable } from '$lib/shared/unreachable';
  import type { BookId } from '$lib/shared/ids';
  import type { RemoteItem } from '../domain/remote-item';
  import { UNSUPPORTED_TEXT } from './catalog-texts';

  type Props = {
    readonly item: RemoteItem;
    readonly cover: string | null;
    readonly readerHref: (id: BookId) => string;
    readonly ondownload: () => void;
    readonly oncancel: () => void;
  };

  let { item, cover, readerHref, ondownload, oncancel }: Props = $props();

  const publication = $derived(item.publication);
  const authors = $derived(publication.authors.join(', '));
  const lang = $derived(publication.language ?? undefined);
</script>

<li class="col gap-2">
  <Card mediaRatio="portrait" aria-label={publication.title}>
    {#snippet media()}
      <Thumbnail src={cover} fill />
    {/snippet}
  </Card>
  <div class="col gap-1">
    <h3 class="text-sm weight-medium truncate" {lang} title={publication.title}>
      {publication.title}
    </h3>
    {#if authors !== ''}
      <p class="text-xs text-muted truncate" title={authors}>{authors}</p>
    {/if}
  </div>
  {#if item.kind === 'remote'}
    <div class="row">
      <Button size="sm" variant="primary" onclick={ondownload}>Download</Button>
    </div>
  {:else if item.kind === 'downloading'}
    <Progress
      label="Downloading {publication.title}"
      value={item.progress === null ? undefined : item.progress * 100}
      size="sm"
    />
    <div class="row">
      <Button size="sm" onclick={oncancel}>Cancel</Button>
    </div>
  {:else if item.kind === 'download-failed'}
    <p class="text-xs text-muted" role="alert">{item.reason}</p>
    <div class="row">
      <Button size="sm" onclick={ondownload}>Retry</Button>
    </div>
  {:else if item.kind === 'held'}
    <div class="row">
      <Button size="sm" href={readerHref(item.bookId)}>Open</Button>
    </div>
  {:else if item.kind === 'held-older'}
    <div class="row items-center gap-2 wrap">
      <Button size="sm" href={readerHref(item.bookId)}>Open</Button>
      <Badge variant="info">Newer on server</Badge>
    </div>
  {:else if item.kind === 'unsupported'}
    <p class="text-xs text-muted">{UNSUPPORTED_TEXT}</p>
  {:else}
    {unreachable(item)}
  {/if}
</li>
