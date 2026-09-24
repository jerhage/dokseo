<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import Input from '$lib/components/Input.svelte';
  import Table from '$lib/components/Table.svelte';
  import DemoSection from './DemoSection.svelte';
  import {
    COLOR_GROUPS,
    FONT_FAMILIES,
    OPACITIES,
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
        <div class="grid-auto grid-auto-sm gap-3">
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
        <div class="grid-auto grid-auto-sm gap-4">
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
      <Card>
        <span class="text-xs text-faint uppercase tracking-wide weight-semibold">Opacity</span>
        <div class="row wrap gap-5">
          {#each OPACITIES as name (name)}
            <div class="stack-sm">
              <span class="shape-sample" style:--sample-opacity="var({name})"></span>
              {@render label(name)}
            </div>
          {/each}
        </div>
      </Card>
      <Card>
        <span class="text-xs text-faint uppercase tracking-wide weight-semibold">
          Language faces follow the lang attribute
        </span>
        <p lang="ja">読書の記録</p>
        <p lang="ko">독서 기록</p>
        <Input lang="ja" value="入力欄も" aria-label="A Japanese field" />
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
