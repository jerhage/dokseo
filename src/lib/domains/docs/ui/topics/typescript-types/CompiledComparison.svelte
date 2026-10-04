<script lang="ts">
  import Alert from '$lib/components/Alert.svelte';
  import CodeBlock from '$lib/components/CodeBlock.svelte';
  import Figure from '$lib/components/Figure.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import type { CompiledExample } from './compiled-example';

  type ComparedExample = {
    readonly title: string;
    readonly example: CompiledExample;
    readonly missed?: string;
  };

  type Props = {
    label: string;
    items: readonly ComparedExample[];
  };

  let { label, items }: Props = $props();
</script>

{#snippet figureTitle()}{label}{/snippet}

<Figure title={figureTitle}>
  <div class={items.length > 1 ? 'grid-2 gap-3' : 'stack-md'}>
    {#each items as item (item.example.file)}
      <div class="stack-sm min-w-0">
        <h3 class="m-0 text-base">{item.title}</h3>
        <DocsCode code={item.example.code} label={item.example.file} />
        {#if item.example.errors === '' && item.missed !== undefined}
          <Alert variant="warning" title="Compiles">{item.missed}</Alert>
        {:else if item.example.errors === ''}
          <Alert variant="success" title="Compiles">tsc prints no error.</Alert>
        {:else}
          <CodeBlock code={item.example.errors} label="tsc {item.example.flags.join(' ')}" wrap />
        {/if}
      </div>
    {/each}
  </div>
  {#snippet caption()}
    Recorded from TypeScript 6.0.3. A test compiles every example again and fails if one message
    changes.
  {/snippet}
</Figure>
