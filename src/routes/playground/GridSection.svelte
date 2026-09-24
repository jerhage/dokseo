<script lang="ts">
  import Skeleton from '$lib/components/Skeleton.svelte';
  import DemoSection from './DemoSection.svelte';
  import Tile from './Tile.svelte';

  const STACKS = ['stack-sm', 'stack-md', 'stack-lg'];
  const STRIP = Array.from({ length: 12 }, (_, index) => `${index + 1}`);
  const ROWS = Array.from({ length: 12 }, (_, index) => `Row ${index + 1}`);
</script>

{#snippet caption(text: string)}
  <span class="text-xs text-faint uppercase tracking-wide weight-semibold">{text}</span>
{/snippet}

<DemoSection
  id="l-grid"
  title="Grid, span and stack"
  classes={[
    'grid-2',
    'grid-3',
    'grid-4',
    'grid-*-col',
    'grid-auto',
    'grid-auto-fit',
    'grid-auto-sm',
    'grid-auto-lg',
    'scroll-strip',
    'h-*',
    'min-h-0',
    'overflow-*',
    'stack-*',
  ]}
>
  <div class="stack-sm">
    {@render caption('.grid-4: at most 4, collapses intrinsically, with .col-span-2')}
    <div class="grid-4">
      <Tile class="col-span-2" variant="feature" label=".col-span-2" />
      <Tile label="3" />
      <Tile label="4" />
      <Tile class="col-span-full" variant="elevated" label=".col-span-full" />
    </div>
  </div>
  <div class="stack-sm">
    {@render caption('.grid-3')}
    <div class="grid-3">
      <Tile label="1" />
      <Tile label="2" />
      <Tile label="3" />
    </div>
  </div>
  <div class="grid-2">
    <div class="stack-sm">
      {@render caption('.grid-4-col: strict, never collapses')}
      <div class="grid-4-col gap-2">
        <Tile label="1" />
        <Tile label="2" />
        <Tile label="3" />
        <Tile label="4" />
      </div>
    </div>
    <div class="stack-sm">
      {@render caption('.grid-2-col and .grid-3-col')}
      <div class="grid-2-col gap-2">
        <Tile label="1" />
        <Tile label="2" />
      </div>
      <div class="grid-3-col gap-2">
        <Tile label="1" />
        <Tile label="2" />
        <Tile label="3" />
      </div>
    </div>
  </div>
  <div class="grid-2">
    <div class="stack-sm">
      {@render caption('.grid-auto: fills with empty tracks')}
      <div class="grid-auto gap-2">
        <Tile label="1" />
        <Tile label="2" />
      </div>
    </div>
    <div class="stack-sm">
      {@render caption('.grid-auto-fit: stretches to fill')}
      <div class="grid-auto-fit gap-2">
        <Tile label="1" />
        <Tile label="2" />
      </div>
    </div>
  </div>
  <div class="grid-2">
    <div class="stack-sm">
      {@render caption('.grid-auto.grid-auto-sm: a denser minimum column')}
      <div class="grid-auto grid-auto-sm gap-2">
        {#each STRIP.slice(0, 8) as label (label)}
          <Tile {label} />
        {/each}
      </div>
    </div>
    <div class="stack-sm">
      {@render caption('.grid-auto.grid-auto-lg: a wider minimum column')}
      <div class="grid-auto grid-auto-lg gap-2">
        <Tile label="1" />
        <Tile label="2" />
      </div>
    </div>
  </div>
  <div class="stack-sm">
    {@render caption('.scroll-strip: one row that scrolls inline and snaps')}
    <ul class="scroll-strip">
      {#each STRIP as label (label)}
        <li><Tile {label} /></li>
      {/each}
    </ul>
  </div>
  <div class="stack-sm">
    {@render caption('.h-full, .min-h-0 and .overflow-y-auto: a fixed frame with a scrolling body')}
    <div class="grid-auto">
      <div class="aspect-video overflow-hidden">
        <div class="col gap-0 h-full min-h-0 bordered rounded-container">
          <div class="p-3 surface text-sm">A header that stays</div>
          <div class="flex-1 min-h-0 overflow-y-auto p-3 stack-sm">
            {#each ROWS as row (row)}
              <span class="text-sm">{row}</span>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="grid-3">
    {#each STACKS as stack (stack)}
      <div class={stack}>
        <code class="text-xs">.{stack}</code>
        <Skeleton shape="text" />
        <Skeleton shape="text" />
        <Skeleton shape="text" />
      </div>
    {/each}
  </div>
</DemoSection>
