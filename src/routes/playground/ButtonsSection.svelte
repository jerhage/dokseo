<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import type { ButtonVariant, ControlSize } from '$lib/components/classes';
  import DemoSection from './DemoSection.svelte';

  const VARIANTS: readonly ButtonVariant[] = [
    'primary',
    'default',
    'outline',
    'ghost',
    'accent',
    'danger',
    'ghost-danger',
  ];

  const SIZES: readonly ControlSize[] = ['sm', 'md', 'lg'];

  let saving = $state(false);
  let pressed = $state(true);

  function save(): void {
    saving = true;
    setTimeout(() => (saving = false), 1500);
  }
</script>

<DemoSection
  id="button"
  title="Button"
  classes={['btn', 'btn-primary', 'btn-outline', 'btn-ghost', 'btn-accent', 'btn-danger']}
>
  <Card>
    <span class="text-xs text-faint uppercase tracking-wide weight-semibold">Variants</span>
    <div class="row wrap items-center gap-3">
      {#each VARIANTS as variant (variant)}
        <Button {variant}>{variant}</Button>
      {/each}
    </div>
  </Card>
  <Card>
    <span class="text-xs text-faint uppercase tracking-wide weight-semibold">Sizes and shapes</span>
    {#each SIZES as size (size)}
      <div class="row wrap items-center gap-3">
        <Button variant="primary" {size}>{size}</Button>
        <Button {size}>{size}</Button>
        <Button {size} pill>Pill</Button>
        <Button {size} square aria-label="Add">+</Button>
      </div>
    {/each}
    <Button variant="primary" block>Block</Button>
  </Card>
  <Card>
    <span class="text-xs text-faint uppercase tracking-wide weight-semibold">States</span>
    <div class="row wrap items-center gap-3">
      <Button variant="primary" loading={saving} disabled={saving} onclick={save}>
        {saving ? 'Saving' : 'Save'}
      </Button>
      <Button variant="primary" loading>Loading</Button>
      <Button active={pressed} aria-pressed={pressed} onclick={() => (pressed = !pressed)}>
        Active: {pressed ? 'on' : 'off'}
      </Button>
      <Button disabled>Disabled</Button>
      <Button variant="primary" disabled>Disabled primary</Button>
    </div>
  </Card>
  <Card>
    <span class="text-xs text-faint uppercase tracking-wide weight-semibold">As a link</span>
    <div class="row wrap items-center gap-3">
      <Button href="#button" size="sm">
        <span aria-hidden="true">‹</span>
        Back
      </Button>
      <Button href="#button" variant="primary">Primary link</Button>
      <Button href="#button" variant="ghost" pill>Ghost pill link</Button>
    </div>
  </Card>
</DemoSection>
