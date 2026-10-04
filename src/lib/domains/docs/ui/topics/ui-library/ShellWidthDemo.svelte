<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import NavLink from '$lib/components/NavLink.svelte';
  import Slider from '$lib/components/Slider.svelte';
  import { anchorSlug } from '$lib/components/table-of-contents';
  import { remPixels } from '../../../domain/css-units';
  import DocsDemo from '../../DocsDemo.svelte';
  import { UI_LIBRARY_SECTIONS } from './sections';

  const LINKS = ['Library', 'Tags', 'Settings'];

  const SECTION_HREF = `#${anchorSlug(UI_LIBRARY_SECTIONS.containers)}`;

  const STEP = 8;

  function readBreakpoint(): { readonly text: string; readonly pixels: number } {
    const style = getComputedStyle(document.documentElement);
    const text = style.getPropertyValue('--breakpoint-narrow').trim();
    return { text, pixels: remPixels(text, Number.parseFloat(style.fontSize)) ?? 0 };
  }

  const breakpoint = readBreakpoint();
  const min = Math.round((breakpoint.pixels * 0.5) / STEP) * STEP;
  const max = Math.round((breakpoint.pixels * 1.25) / STEP) * STEP;

  let width = $state(Math.round((breakpoint.pixels * 0.75) / STEP) * STEP);
  let current = $state('Library');

  const narrow = $derived(width < breakpoint.pixels);
</script>

<DocsDemo label="A container query on the app shell">
  {#snippet caption()}
    The shell switches at <code>--breakpoint-narrow</code>, read from the stylesheet as
    <code>{breakpoint.text}</code>, which is {breakpoint.pixels}px here. Past the width of this
    column, the box scrolls sideways.
  {/snippet}
  <div class="stack-md">
    <Slider
      label="Shell width"
      value={width}
      {min}
      {max}
      step={STEP}
      valuetext="{width} pixels"
      oninput={(event) => (width = Number(event.currentTarget.value))}
    />
    <p class="text-sm m-0">
      <code>{width}px</code>
      {narrow ? 'is below' : 'is at or above'} the breakpoint: the
      {narrow ? 'narrow' : 'wide'} layout.
    </p>
    <div class="overflow-auto">
      <div class="shell-stage" style:--shell-width="{width}px">
        <div class="layout-app-shell layout-app-shell-embedded bordered">
          <header class="layout-app-shell-header">
            <strong class="display">Dokseo</strong>
            <Button size="sm" variant="primary">Add a book</Button>
          </header>
          <nav class="layout-app-shell-nav" aria-label="Shell demo">
            {#each LINKS as link (link)}
              <NavLink
                href={SECTION_HREF}
                current={current === link}
                onclick={(event) => {
                  event.preventDefault();
                  current = link;
                }}>{link}</NavLink
              >
            {/each}
          </nav>
          <div class="layout-main-area">
            <p class="m-0">{current}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</DocsDemo>
