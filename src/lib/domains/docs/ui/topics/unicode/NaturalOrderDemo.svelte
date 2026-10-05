<script lang="ts">
  import Field from '$lib/ui/components/Field.svelte';
  import Textarea from '$lib/ui/components/Textarea.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import { codeUnitOrder, naturalOrder } from './dokseo-text';

  let written = $state('page10.jpg\npage2.jpg\nPage1.jpg\npage02.jpg\n第10話.png\n第２話.png');

  const names = $derived(written.split('\n').filter((name) => name.trim().length > 0));
  const natural = $derived(naturalOrder(names));
  const units = $derived(codeUnitOrder(names));
</script>

<DocsDemo label="Sorting page names">
  {#snippet caption()}
    The first list is the real <code>compareNatural</code>; the second is the default
    <code>sort()</code>, by UTF-16 code units.
  {/snippet}
  <div class="stack-md">
    <Field label="File names, one per line">
      {#snippet children(control)}
        <Textarea {...control} bind:value={written} rows={6} lang="ja" />
      {/snippet}
    </Field>
    <div class="grid-2 gap-4">
      <div class="stack-sm">
        <p class="m-0 text-sm text-muted">compareNatural</p>
        <ol class="m-0 mono text-sm" lang="ja">
          {#each natural as name, index (index)}<li>{name}</li>{/each}
        </ol>
      </div>
      <div class="stack-sm">
        <p class="m-0 text-sm text-muted">sort()</p>
        <ol class="m-0 mono text-sm" lang="ja">
          {#each units as name, index (index)}<li>{name}</li>{/each}
        </ol>
      </div>
    </div>
  </div>
</DocsDemo>
