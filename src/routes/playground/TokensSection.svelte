<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import Table from '$lib/components/Table.svelte';
  import DemoSection from './DemoSection.svelte';
  import {
    COLOR_GROUPS,
    FONT_FAMILIES,
    RADII,
    SHADOWS,
    SPACING,
    TYPE_SCALE,
    Z_SCALE,
  } from './token-catalog';
  import './tokens-section.css';

  let zValues = $state<readonly string[]>([]);

  $effect(() => {
    const computed = getComputedStyle(document.documentElement);
    zValues = Z_SCALE.map((name) => computed.getPropertyValue(name).trim());
  });
</script>

{#snippet label(name: string)}
  <code class="text-xs">{name}</code>
{/snippet}

<DemoSection id="tokens" title="Semantic tokens" classes={[]}>
  <div class="tokens-section stack-lg">
    <p class="text-sm text-muted prose">
      Live values of the contract names under the active theme and scheme.
    </p>
    {#each COLOR_GROUPS as group (group.title)}
      <div class="stack-sm">
        <span class="text-xs text-faint uppercase tracking-wide weight-semibold">{group.title}</span
        >
        <div class="grid-auto sample-grid gap-3">
          {#each group.tokens as name (name)}
            <div class="stack-sm">
              <div class="swatch" style:--swatch="var({name})"></div>
              {@render label(name)}
            </div>
          {/each}
        </div>
      </div>
    {/each}
    <div class="grid-2 gap-5">
      <Card>
        <span class="text-xs text-faint uppercase tracking-wide weight-semibold">Type scale</span>
        {#each TYPE_SCALE as name (name)}
          <div class="row wrap items-center gap-3">
            <span class="type-sample" style:--sample-size="var({name})">Aa</span>
            {@render label(name)}
          </div>
        {/each}
      </Card>
      <Card>
        <span class="text-xs text-faint uppercase tracking-wide weight-semibold">Font families</span
        >
        {#each FONT_FAMILIES as name (name)}
          <div class="stack-sm">
            <span class="type-sample" style:--sample-family="var({name})">
              The quick brown fox · 読む · 읽다
            </span>
            {@render label(name)}
          </div>
        {/each}
      </Card>
      <Card>
        <span class="text-xs text-faint uppercase tracking-wide weight-semibold">Spacing</span>
        {#each SPACING as name (name)}
          <div class="row items-center gap-3">
            <span class="space-sample" style:--sample-space="var({name})"></span>
            {@render label(name)}
          </div>
        {/each}
      </Card>
      <Card>
        <span class="text-xs text-faint uppercase tracking-wide weight-semibold">Radii</span>
        <div class="grid-auto sample-grid gap-4">
          {#each RADII as name (name)}
            <div class="stack-sm">
              <span class="shape-sample" style:--sample-radius="var({name})"></span>
              {@render label(name)}
            </div>
          {/each}
        </div>
      </Card>
      <Card>
        <span class="text-xs text-faint uppercase tracking-wide weight-semibold">Shadows</span>
        <div class="row wrap gap-5">
          {#each SHADOWS as name (name)}
            <div class="stack-sm">
              <span class="shape-sample" style:--sample-shadow="var({name})"></span>
              {@render label(name)}
            </div>
          {/each}
        </div>
      </Card>
      <Table compact caption="Z-index scale">
        <thead>
          <tr><th>Token</th><th class="table-numeric">Value</th></tr>
        </thead>
        <tbody>
          {#each Z_SCALE as name, index (name)}
            <tr
              ><td class="mono">{name}</td><td class="table-numeric">{zValues[index] ?? ''}</td></tr
            >
          {/each}
        </tbody>
      </Table>
    </div>
  </div>
</DemoSection>
