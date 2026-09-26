<script lang="ts">
  import type { Component } from 'svelte';
  import Card from '$lib/components/Card.svelte';
  import ChevronRight from '$lib/components/icons/ChevronRight.svelte';
  import type { IconProps } from '$lib/components/icons/icon';
  import Info from '$lib/components/icons/Info.svelte';
  import Upload from '$lib/components/icons/Upload.svelte';
  import DemoSection from './DemoSection.svelte';
  import { iconCatalog } from './icon-catalog';

  const ICONS = iconCatalog(
    import.meta.glob<Component<IconProps>>('$lib/components/icons/*.svelte', {
      eager: true,
      import: 'default',
    }),
  );

  const SIZES: readonly number[] = [16, 20, 24, 32];

  const STROKES: readonly number[] = [1, 1.5, 2, 3];

  const SAMPLES: readonly Component<IconProps>[] = [Info, Upload, ChevronRight];
</script>

<DemoSection id="icons" title="Icons" classes={['lucide']}>
  <p class="text-sm text-muted">
    Lucide icons, one component per icon in src/lib/components/icons/, each imported by its own
    path. The stroke follows the theme unless a strokeWidth is given.
  </p>
  <Card>
    <ul class="list-reset grid-auto grid-auto-sm gap-3">
      {#each ICONS as entry (entry.name)}
        <li class="col items-center gap-2 p-3 bordered rounded-container">
          <entry.icon />
          <code class="text-xs">{entry.name}</code>
        </li>
      {/each}
    </ul>
  </Card>
  <Card>
    <span class="text-xs text-faint uppercase tracking-wide weight-semibold">
      Size, at the theme stroke
    </span>
    <div class="row wrap items-end gap-6">
      {#each SIZES as size (size)}
        <div class="col items-center gap-2">
          <div class="row items-center gap-2">
            {#each SAMPLES as Sample, index (index)}
              <Sample {size} />
            {/each}
          </div>
          <code class="text-xs">size={size}</code>
        </div>
      {/each}
    </div>
    <span class="text-xs text-faint uppercase tracking-wide weight-semibold">
      A fixed stroke, and an absolute one
    </span>
    <div class="row wrap items-end gap-6">
      {#each STROKES as strokeWidth (strokeWidth)}
        <div class="col items-center gap-2">
          <div class="row items-center gap-2">
            {#each SAMPLES as Sample, index (index)}
              <Sample {strokeWidth} />
            {/each}
          </div>
          <code class="text-xs">strokeWidth={strokeWidth}</code>
        </div>
      {/each}
      <div class="col items-center gap-2">
        <div class="row items-center gap-2">
          {#each SIZES as size (size)}
            <Info {size} absoluteStrokeWidth />
          {/each}
        </div>
        <code class="text-xs">absoluteStrokeWidth</code>
      </div>
    </div>
    <div class="row wrap items-center gap-3 text-sm">
      <span class="row items-center gap-2 text-muted"><Info /> The colour follows the text.</span>
      <span class="row items-center gap-2"><Info aria-label="Information" /> A named icon.</span>
    </div>
  </Card>
</DemoSection>
