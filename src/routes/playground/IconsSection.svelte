<script lang="ts">
  import type { Component } from 'svelte';
  import Alert from '$lib/components/Alert.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import { TAG_COLOURS } from '$lib/components/classes';
  import ChevronRight from '$lib/components/icons/ChevronRight.svelte';
  import CircleCheck from '$lib/components/icons/CircleCheck.svelte';
  import CircleX from '$lib/components/icons/CircleX.svelte';
  import File from '$lib/components/icons/File.svelte';
  import type { IconProps } from '$lib/components/icons/icon';
  import Info from '$lib/components/icons/Info.svelte';
  import Palette from '$lib/components/icons/Palette.svelte';
  import Pencil from '$lib/components/icons/Pencil.svelte';
  import TriangleAlert from '$lib/components/icons/TriangleAlert.svelte';
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

  type ColourSample = {
    readonly role: string;
    readonly icon: Component<IconProps>;
  };

  const COLOURS: readonly ColourSample[] = [
    { role: 'primary', icon: Pencil },
    { role: 'accent', icon: Palette },
    { role: 'success', icon: CircleCheck },
    { role: 'warning', icon: TriangleAlert },
    { role: 'danger', icon: CircleX },
    { role: 'info', icon: Info },
  ];
</script>

<DemoSection
  id="icons"
  title="Icons"
  classes={[
    'lucide',
    'text-primary',
    'text-accent',
    'text-success',
    'text-warning',
    'text-danger',
    'text-info',
  ]}
>
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
  <Card>
    <p class="text-sm text-muted">
      An icon strokes in currentColor, so it takes its colour from the text around it. Switch the
      theme and the scheme in the header to see how each theme colours them.
    </p>
    <span class="text-xs text-faint uppercase tracking-wide weight-semibold">
      A text colour utility
    </span>
    <div class="row wrap items-end gap-6">
      {#each COLOURS as sample (sample.role)}
        <div class="col items-center gap-2">
          <sample.icon size={24} class="text-{sample.role}" />
          <code class="text-xs">.text-{sample.role}</code>
        </div>
      {/each}
    </div>
    <span class="text-xs text-faint uppercase tracking-wide weight-semibold">
      The color prop, given a semantic token
    </span>
    <div class="row wrap items-end gap-6">
      {#each COLOURS as sample (sample.role)}
        <div class="col items-center gap-2">
          <sample.icon size={24} color="var(--color-{sample.role})" />
          <code class="text-xs">color="var(--color-{sample.role})"</code>
        </div>
      {/each}
    </div>
    <span class="text-xs text-faint uppercase tracking-wide weight-semibold">
      Inherited from a coloured parent
    </span>
    <div class="row wrap items-center gap-3">
      <Button variant="primary"><Upload class="btn-icon" /> Upload</Button>
      <Button variant="danger"><CircleX class="btn-icon" /> Remove</Button>
      <Button variant="ghost-danger"><CircleX class="btn-icon" /> Remove</Button>
    </div>
    <Alert variant="danger" title="Inside a danger alert">
      <span class="row items-center gap-2"
        ><File /> The file icon takes the colour of the alert text.</span
      >
    </Alert>
    <p class="row wrap items-center gap-2 text-sm text-success">
      <CircleCheck /> Inside a paragraph with the success text colour.
    </p>
    <span class="text-xs text-faint uppercase tracking-wide weight-semibold">
      The tag colours, through the color prop
    </span>
    <ul class="list-reset row wrap items-end gap-4">
      {#each TAG_COLOURS as colour (colour)}
        <li class="col items-center gap-1">
          <File size={24} color="var(--color-tag-{colour})" />
          <code class="text-xs">{colour}</code>
        </li>
      {/each}
    </ul>
  </Card>
</DemoSection>
