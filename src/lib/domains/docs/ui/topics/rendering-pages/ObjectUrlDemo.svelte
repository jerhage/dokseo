<script lang="ts">
  import { onDestroy } from 'svelte';
  import Alert from '$lib/ui/components/Alert.svelte';
  import Badge from '$lib/ui/components/Badge.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import { sizeFigure } from '../../../domain/bitmap-memory';
  import type { PixelSize } from '../../../domain/bitmap-memory';
  import { spaceFigure } from '../../../domain/storage-figures';
  import DocsDemo from '../../DocsDemo.svelte';
  import { ObjectUrlLifecycle } from './object-url-lifecycle.svelte';
  import { bundledPage } from './sample-images';
  import './url-demo.css';

  type Props = { pageUrl: string };

  let { pageUrl }: Props = $props();

  async function loadImage(url: string): Promise<PixelSize> {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  }

  const lifecycle = new ObjectUrlLifecycle({
    makeBlob: () => bundledPage(pageUrl),
    createUrl: (blob) => URL.createObjectURL(blob),
    revokeUrl: (url) => URL.revokeObjectURL(url),
    loadImage,
  });

  const stage = $derived(lifecycle.stage);

  onDestroy(() => lifecycle.dispose());
</script>

<DocsDemo label="An object URL from creation to revoke">
  <div class="row wrap items-center gap-2">
    <Button
      size="sm"
      variant="primary"
      disabled={stage.kind === 'created' || stage.kind === 'creating'}
      onclick={() => void lifecycle.create()}
    >
      URL.createObjectURL(blob)
    </Button>
    <Button
      size="sm"
      disabled={stage.kind !== 'created' && stage.kind !== 'revoked'}
      onclick={() => void lifecycle.loadAgain()}
    >
      Load it in a new &lt;img&gt;
    </Button>
    <Button
      size="sm"
      variant="ghost-danger"
      disabled={stage.kind !== 'created'}
      onclick={() => lifecycle.revoke()}
    >
      URL.revokeObjectURL(url)
    </Button>
  </div>

  {#if stage.kind === 'failed'}
    <Alert variant="danger" title="The sample did not load">{stage.message}</Alert>
  {:else if stage.kind === 'created' || stage.kind === 'revoked'}
    <div class="rendering-url-demo grid-2 gap-4">
      <img class="shown bordered" src={stage.url} alt="The sample page, shown through the URL" />
      <div class="stack-sm min-w-0 text-sm">
        <p class="m-0"><code class="url">{stage.url}</code></p>
        <p class="row wrap items-center gap-2 m-0">
          <span>The URL names a blob of</span>
          <Badge>{spaceFigure(stage.bytes)}</Badge>
          {#if stage.kind === 'created'}
            <Badge variant="warning">live, the blob is pinned</Badge>
          {:else}
            <Badge variant="success">revoked, the blob can be collected</Badge>
          {/if}
        </p>
        {#if stage.kind === 'revoked'}
          <p class="m-0 text-muted">
            The picture beside this text stays. It was fetched and decoded while the URL was live.
          </p>
        {/if}
        <ol class="m-0 stack-sm">
          {#each lifecycle.attempts as tried (tried.id)}
            <li>
              A new <code>&lt;img&gt;</code> while the URL was {tried.stage}:
              {#if tried.outcome.kind === 'image-loaded'}
                <span class="text-success">loaded, {sizeFigure(tried.outcome.size)}</span>
              {:else}
                <span class="text-danger">failed, {tried.outcome.message}</span>
              {/if}
            </li>
          {/each}
        </ol>
      </div>
    </div>
  {:else}
    <p class="m-0 text-sm text-muted">
      No URL yet. The first button fetches the bundled sample page as a Blob and mints a URL for it.
    </p>
  {/if}
  {#snippet caption()}
    The URL is the same string before and after the revoke. Only the entry it names in the blob URL
    store is gone, so anything that resolves the string afresh fails.
  {/snippet}
</DocsDemo>
