<script lang="ts">
  import { mount, unmount, untrack } from 'svelte';
  import Field from '$lib/ui/components/Field.svelte';
  import SegmentedControl from '$lib/ui/components/SegmentedControl.svelte';
  import Select from '$lib/ui/components/Select.svelte';
  import { COLOR_SCHEMES, THEMES, applyAppearance } from '$lib/ui/core/appearance.js';
  import type { Appearance, ColorScheme } from '$lib/ui/core/appearance.js';
  import { SCHEME_LABELS, THEME_LABELS } from '$lib/shared/appearance-labels';
  import DocsDemo from '../../DocsDemo.svelte';
  import ThemeSpecimen from './ThemeSpecimen.svelte';

  const PAGE_STYLES = 'style, link[rel="stylesheet"]';

  const schemeOptions = COLOR_SCHEMES.map((value) => ({ value, label: SCHEME_LABELS[value] }));

  let appearance = $state<Appearance>({ theme: 'ember', colorScheme: 'dark' });
  let frameRoot: HTMLElement | null = null;
  let height = $state(0);

  function show(next: Appearance): void {
    appearance = next;
    if (frameRoot !== null) applyAppearance(frameRoot, next);
  }

  function chooseTheme(value: string): void {
    const theme = THEMES.find((name) => name === value);
    if (theme !== undefined) show({ ...appearance, theme });
  }

  function chooseScheme(colorScheme: ColorScheme): void {
    show({ ...appearance, colorScheme });
  }

  function mountSpecimen(frame: HTMLIFrameElement): () => void {
    const inner = frame.contentDocument;
    if (inner === null) return () => {};
    for (const node of Array.from(document.head.querySelectorAll(PAGE_STYLES)))
      inner.head.append(node.cloneNode(true));
    inner.body.classList.add('surface-bg', 'p-4');
    applyAppearance(
      inner.documentElement,
      untrack(() => appearance),
    );
    frameRoot = inner.documentElement;
    const specimen = mount(ThemeSpecimen, { target: inner.body });
    const observer = new ResizeObserver(() => (height = inner.documentElement.scrollHeight));
    observer.observe(inner.body);
    return () => {
      observer.disconnect();
      void unmount(specimen);
      frameRoot = null;
    };
  }
</script>

<DocsDemo label="A theme in a second document">
  {#snippet caption()}
    The frame is a separate document with its own root element. The controls set its
    <code>data-theme</code> and <code>data-color-scheme</code> with <code>applyAppearance</code>,
    the function the appearance menu calls before it saves a choice. This demo saves nothing.
  {/snippet}
  <div class="stack-md">
    <div class="row wrap items-end gap-4">
      <Field label="Theme">
        {#snippet children(control)}
          <Select
            {...control}
            value={appearance.theme}
            onchange={(event) => chooseTheme(event.currentTarget.value)}
          >
            {#each THEMES as theme (theme)}
              <option value={theme}>{THEME_LABELS[theme]}</option>
            {/each}
          </Select>
        {/snippet}
      </Field>
      <SegmentedControl
        label="Color scheme"
        options={schemeOptions}
        value={appearance.colorScheme}
        onvaluechange={chooseScheme}
      />
    </div>
    <iframe
      class="theme-frame bordered rounded-container w-full"
      title="Specimen components in the chosen theme"
      style:--theme-frame-height="{height}px"
      {@attach mountSpecimen}
    ></iframe>
  </div>
</DocsDemo>
