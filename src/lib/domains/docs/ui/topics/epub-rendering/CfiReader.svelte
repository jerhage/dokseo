<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Field from '$lib/components/Field.svelte';
  import Input from '$lib/components/Input.svelte';
  import { cfiPartMeaning, readCfi } from '../../../domain/cfi-reading';
  import DocsDemo from '../../DocsDemo.svelte';

  const SPEC_EXAMPLE = 'epubcfi(/6/4[chap01ref]!/4[body01]/10[para05]/3:10)';

  let cfi = $state(SPEC_EXAMPLE);

  const parts = $derived(readCfi(cfi));
</script>

<DocsDemo label="Reading a CFI">
  {#snippet controls()}
    <Button size="sm" variant="ghost" onclick={() => (cfi = SPEC_EXAMPLE)}
      >Back to the example</Button
    >
  {/snippet}
  {#snippet caption()}
    The example is the one in the CFI specification. Paste any CFI, such as one from the live demos
    further down.
  {/snippet}
  <div class="stack-md">
    <Field label="CFI">
      {#snippet children(control)}
        <Input {...control} bind:value={cfi} spellcheck="false" />
      {/snippet}
    </Field>
    {#if parts === null}
      <p class="text-sm text-muted m-0">That is not a CFI of the form <code>epubcfi(…)</code>.</p>
    {:else}
      <ol class="list-reset stack-sm text-sm">
        {#each parts as part, index (index)}
          <li class="row wrap gap-2">
            <code>{part.text}</code>
            <span class="text-muted">{cfiPartMeaning(part)}</span>
          </li>
        {/each}
      </ol>
    {/if}
  </div>
</DocsDemo>
