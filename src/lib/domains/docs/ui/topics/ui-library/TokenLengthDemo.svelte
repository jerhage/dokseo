<script lang="ts">
  import Badge from '$lib/ui/components/Badge.svelte';
  import { pixelLength } from '$lib/ui/components/css-length';
  import DocsDemo from '../../DocsDemo.svelte';
  import { PRIMITIVE_NAMES } from './snippets';

  type Reading = {
    readonly name: string;
    readonly registered: boolean;
    readonly text: string;
    readonly parsed: number;
  };

  const TOKENS = [
    { name: '--sp-4', registered: false },
    { name: '--carousel-gap', registered: true },
  ] as const;

  function readAll(): readonly Reading[] {
    const style = getComputedStyle(document.documentElement);
    return TOKENS.map(({ name, registered }) => ({
      name,
      registered,
      text: style.getPropertyValue(name),
      parsed: pixelLength(style, name),
    }));
  }

  const readings = readAll();
</script>

<DocsDemo label="Reading a length token from script" resettable resetLabel="Read again">
  {#snippet caption()}
    Both tokens are <code>{PRIMITIVE_NAMES.space4Reference}</code> in the stylesheet. Only the registered
    one reads back in pixels.
  {/snippet}
  <ul class="list-reset stack-sm">
    {#each readings as reading (reading.name)}
      <li class="row wrap items-center gap-2">
        <code>{reading.name}</code>
        <Badge variant={reading.registered ? 'success' : 'warning'}
          >{reading.registered ? 'registered' : 'not registered'}</Badge
        >
        <span class="text-sm text-muted">reads</span>
        <code>"{reading.text}"</code>
        <span class="text-sm text-muted"><code>pixelLength</code> gives</span>
        <code>{reading.parsed}</code>
      </li>
    {/each}
  </ul>
</DocsDemo>
