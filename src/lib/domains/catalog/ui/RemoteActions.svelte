<script lang="ts">
  import Badge from '$lib/ui/components/Badge.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Progress from '$lib/ui/components/Progress.svelte';
  import { unreachable } from '$lib/shared/unreachable';
  import type { BookId } from '$lib/shared/ids';
  import type { RemoteItem } from '../domain/remote-item';
  import { UNSUPPORTED_TEXT } from './catalog-texts';

  type Props = {
    readonly item: RemoteItem;
    readonly readerHref: (id: BookId) => string;
    readonly ondownload: () => void;
    readonly oncancel: () => void;
    readonly onreplace: () => void;
  };

  let { item, readerHref, ondownload, oncancel, onreplace }: Props = $props();
</script>

{#if item.kind === 'remote'}
  <div class="row">
    <Button size="sm" variant="primary" onclick={ondownload}>Download</Button>
  </div>
{:else if item.kind === 'downloading'}
  <Progress
    label="Downloading {item.publication.title}"
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
    <Button size="sm" onclick={onreplace}>Replace with newer version</Button>
    <Badge variant="info">Newer on server</Badge>
  </div>
{:else if item.kind === 'unsupported'}
  <p class="text-xs text-muted">{UNSUPPORTED_TEXT}</p>
{:else}
  {unreachable(item)}
{/if}
