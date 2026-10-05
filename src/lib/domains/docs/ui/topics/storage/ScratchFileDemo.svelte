<script lang="ts">
  import { onMount } from 'svelte';
  import Alert from '$lib/ui/components/Alert.svelte';
  import Badge from '$lib/ui/components/Badge.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import { createScratchFileStore } from './scratch-file';
  import { SCRATCH_PATH, ScratchFile } from './scratch-file.svelte';

  const scratch = new ScratchFile({ store: createScratchFileStore(), now: Date.now });

  const state = $derived(scratch.state);

  onMount(() => {
    void scratch.refresh();
  });
</script>

<DocsDemo label="A scratch file in OPFS">
  <p class="m-0 text-sm">
    The buttons work on <code>{SCRATCH_PATH}</code>, a file only this demo uses. A dedicated worker
    writes it through a sync access handle; the page reads it back with <code>getFile()</code>.
  </p>
  <div class="row wrap items-center gap-2">
    <Button
      size="sm"
      variant="primary"
      disabled={scratch.busy}
      onclick={() => void scratch.write()}
    >
      Write the file in a worker
    </Button>
    <Button
      size="sm"
      variant="ghost-danger"
      disabled={scratch.busy || state.kind !== 'present'}
      onclick={() => void scratch.remove()}>Delete the demo folder</Button
    >
  </div>

  {#if state.kind === 'unsupported'}
    <Alert variant="warning" title="No origin private file system">
      This browser has no <code>navigator.storage.getDirectory()</code>.
    </Alert>
  {:else if state.kind === 'failed'}
    <Alert variant="danger" title="The demo file failed">{state.message}</Alert>
  {:else if state.kind === 'present'}
    <p class="row wrap items-center gap-2 m-0 text-sm">
      {#if scratch.written !== null}
        <span>The worker's <code>write()</code> returned</span>
        <Badge>{scratch.written} bytes</Badge>
      {/if}
      <span>The file reads back as</span>
      <Badge>{state.content.bytes} bytes</Badge>
    </p>
    <p class="m-0 text-sm"><code>{state.content.text}</code></p>
  {:else if state.kind === 'absent'}
    <p class="m-0 text-sm text-muted">The demo file does not exist on this device.</p>
  {/if}

  {#if scratch.root.length > 0}
    <p class="row wrap items-center gap-2 m-0 text-sm">
      <span>At the root of this origin's file system:</span>
      {#each scratch.root as entry (entry.name)}
        <Badge>{entry.name}{entry.kind === 'directory' ? '/' : ''}</Badge>
      {/each}
    </p>
  {/if}
</DocsDemo>
