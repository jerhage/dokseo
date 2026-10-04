<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Field from '$lib/components/Field.svelte';
  import SegmentedControl from '$lib/components/SegmentedControl.svelte';
  import Select from '$lib/components/Select.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import { BUTTON_SIZES, BUTTON_VARIANTS } from '$lib/components/classes';
  import type { ButtonVariant, ControlSize } from '$lib/components/classes';
  import DocsDemo from '../../DocsDemo.svelte';

  const VARIANTS = Object.keys(BUTTON_VARIANTS).filter((name): name is ButtonVariant =>
    Object.hasOwn(BUTTON_VARIANTS, name),
  );

  const SIZE_OPTIONS = Object.keys(BUTTON_SIZES)
    .filter((name): name is ControlSize => Object.hasOwn(BUTTON_SIZES, name))
    .map((value) => ({ value, label: value }));

  let variant = $state<ButtonVariant>('primary');
  let size = $state<ControlSize>('md');
  let pill = $state(false);
  let loading = $state(false);
  let rendered = $state('');

  function chooseVariant(value: string): void {
    const chosen = VARIANTS.find((name) => name === value);
    if (chosen !== undefined) variant = chosen;
  }

  function watchClass(node: HTMLElement): () => void {
    const button = node.querySelector('.btn');
    if (button === null) return () => {};
    rendered = button.className;
    const observer = new MutationObserver(() => (rendered = button.className));
    observer.observe(button, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }
</script>

<DocsDemo label="Props to classes">
  {#snippet caption()}
    The class list is read from the rendered element each time it changes.
  {/snippet}
  <div class="stack-md">
    <div class="row wrap items-end gap-4">
      <Field label="variant">
        {#snippet children(control)}
          <Select
            {...control}
            value={variant}
            onchange={(event) => chooseVariant(event.currentTarget.value)}
          >
            {#each VARIANTS as name (name)}
              <option value={name}>{name}</option>
            {/each}
          </Select>
        {/snippet}
      </Field>
      <SegmentedControl label="size" options={SIZE_OPTIONS} bind:value={size} />
      <Toggle bind:checked={pill}><code>pill</code></Toggle>
      <Toggle bind:checked={loading}><code>loading</code></Toggle>
    </div>
    <div class="row items-center gap-4" {@attach watchClass}>
      <Button {variant} {size} {pill} {loading}>Continue reading</Button>
    </div>
    <p class="m-0"><code>class="{rendered}"</code></p>
  </div>
</DocsDemo>
