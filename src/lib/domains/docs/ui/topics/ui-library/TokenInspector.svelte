<script lang="ts">
  import { tick } from 'svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Field from '$lib/components/Field.svelte';
  import Select from '$lib/components/Select.svelte';
  import { tokenChain } from '../../../domain/cascade';
  import type { TokenChain } from '../../../domain/cascade';
  import DocsDemo from '../../DocsDemo.svelte';
  import { readPageStyles, winnerFor } from '../../stylesheet-rules';

  const TOKENS = [
    '--color-primary',
    '--color-surface',
    '--color-text-muted',
    '--radius-control',
    '--font-body',
    '--sp-4',
  ] as const;

  const END_NOTES: Readonly<Record<TokenChain['end'], string>> = {
    value: 'The chain ends at a value.',
    missing: 'No rule on the root declares the next name.',
    'too-deep': 'The chain did not end within twelve steps.',
  };

  let token = $state<string>(TOKENS[0]);
  let chain = $state<TokenChain>({ steps: [], end: 'missing' });
  let resolved = $state('');
  let swatch = $state<HTMLElement | null>(null);

  const isColor = $derived(token.startsWith('--color-'));

  async function read(): Promise<void> {
    await tick();
    const root = document.documentElement;
    const styles = readPageStyles(document);
    chain = tokenChain(token, (name) => winnerFor(root, name, styles));
    resolved = swatch === null ? '' : getComputedStyle(swatch).backgroundColor;
  }

  function followRoot(): () => void {
    void read();
    const observer = new MutationObserver(() => void read());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-color-scheme'],
    });
    return () => observer.disconnect();
  }
</script>

<DocsDemo label="Token inspector">
  {#snippet caption()}
    The chain is read from the rules that match the root element now. Pick a theme in the appearance
    menu at the top of the page and the chain updates. That menu saves its choice, as it does
    everywhere in Dokseo.
  {/snippet}
  <div class="stack-md" {@attach followRoot}>
    <Field label="Token">
      {#snippet children(control)}
        <Select {...control} bind:value={token} onchange={() => void read()}>
          {#each TOKENS as name (name)}
            <option value={name}>{name}</option>
          {/each}
        </Select>
      {/snippet}
    </Field>
    <ol class="list-reset stack-sm">
      {#each chain.steps as step, index (index)}
        <li class="stack-sm">
          <span class="row wrap items-center gap-2">
            <code>{step.name}</code>
            <Badge variant="accent">{step.entry.layer ?? 'unlayered'}</Badge>
            <span class="text-sm text-faint">{step.entry.selector}</span>
          </span>
          <code class="token-value">{step.entry.value}</code>
        </li>
      {/each}
    </ol>
    <p class="text-sm text-muted m-0">{END_NOTES[chain.end]}</p>
    {#if isColor}
      <div class="row items-center gap-3">
        <span class="token-swatch shrink-0" style:--token-swatch="var({token})" bind:this={swatch}
        ></span>
        <span class="text-sm">Resolved here: <code>{resolved}</code></span>
      </div>
    {/if}
  </div>
</DocsDemo>
