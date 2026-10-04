<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Field from '$lib/components/Field.svelte';
  import Input from '$lib/components/Input.svelte';
  import { bookTitle, plausibleTitle, suggestTitle } from '$lib/domains/library/domain/book/title';
  import DocsDemo from '../../DocsDemo.svelte';

  const EXAMPLES: readonly string[] = [
    'Akira Vol. 1',
    'Untitled',
    'Microsoft Word - chapter01.doc',
    'C:\\Users\\scan\\akira',
    '/Users/me/Desktop/akira',
    'Untitled Goose: A History',
    '   ',
  ];

  let declared = $state('Microsoft Word - chapter01.doc');
  let fileName = $state('Akira_v01.pdf');

  const accepted = $derived(plausibleTitle(declared));
  const fileTitle = $derived(suggestTitle('pdf', [{ name: fileName, path: '' }]));
  const stored = $derived(bookTitle(accepted, fileTitle));
</script>

<DocsDemo label="Check a metadata title">
  {#snippet caption()}
    The verdict is the real <code>plausibleTitle</code>, the file title the real
    <code>suggestTitle</code>, and the stored title the real <code>bookTitle</code>.
  {/snippet}
  <div class="stack-md">
    <div class="row wrap gap-2">
      {#each EXAMPLES as example (example)}
        <Button size="sm" variant="outline" onclick={() => (declared = example)}
          >{example.trim().length > 0 ? example : 'Blank'}</Button
        >
      {/each}
    </div>
    <div class="grid-2 gap-2">
      <Field label="Title in the metadata">
        {#snippet children(control)}
          <Input {...control} bind:value={declared} />
        {/snippet}
      </Field>
      <Field label="File name">
        {#snippet children(control)}
          <Input {...control} bind:value={fileName} />
        {/snippet}
      </Field>
    </div>
    <p class="m-0 row wrap items-center gap-2">
      {#if accepted === null}
        <Badge variant="warning">rejected</Badge> The metadata title is not used.
      {:else}
        <Badge variant="success">accepted</Badge> The metadata title is used, trimmed.
      {/if}
    </p>
    <p class="m-0">Stored title: <strong>{stored}</strong></p>
  </div>
</DocsDemo>
