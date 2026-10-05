<script lang="ts">
  import Button from '../components/Button.svelte';
  import Card from '../components/Card.svelte';
  import Toast from '../components/Toast.svelte';
  import ToastClearance from '../components/ToastClearance.svelte';
  import ToastRegion from '../components/ToastRegion.svelte';
  import Toggle from '../components/Toggle.svelte';
  import type { StatusVariant } from '../components/classes';
  import { getToaster } from '../components/toast-context';
  import { createToaster } from '../components/toaster.svelte';
  import DemoSection from './DemoSection.svelte';

  const VARIANTS: readonly StatusVariant[] = ['info', 'success', 'warning', 'danger'];

  const CLEARANCE_PX = 120;

  const inline = createToaster();
  const separate = createToaster();
  const app = getToaster();

  let regionShown = $state(false);
  let topShown = $state(false);
  let clearing = $state(false);

  function fillInline(): void {
    for (const variant of VARIANTS) {
      inline.show({ variant, title: `The ${variant} variant`, duration: 'persistent' });
    }
  }
</script>

<DemoSection
  id="toast"
  title="Toast, region and clearance"
  classes={['toast', 'toast-region', 'toast-region-top']}
>
  <p class="text-sm text-muted">
    A toast drawn straight into the page from its own toaster, a region bound to a second toaster, a
    clearance that lifts the app's toasts above a bar at the bottom of the screen, and a region at
    the top that takes the toasts placed there.
  </p>
  <div class="grid-2">
    <Card>
      <span class="eyebrow text-faint weight-semibold">Toast</span>
      <div class="row wrap items-center gap-3">
        <Button size="sm" onclick={fillInline}>Add four</Button>
      </div>
      <div class="col gap-3">
        {#each inline.toasts as toast (toast.id)}
          <Toast {toast} toaster={inline} dismissLabel="Dismiss" />
        {/each}
      </div>
    </Card>
    <Card>
      <span class="eyebrow text-faint weight-semibold">Region</span>
      <Toggle bind:checked={regionShown}>Mount a region for a second toaster</Toggle>
      <div class="row wrap items-center gap-3">
        <Button
          size="sm"
          disabled={!regionShown}
          onclick={() => separate.show({ title: 'From the second toaster' })}
        >
          Show in that region
        </Button>
      </div>
      <span class="eyebrow text-faint weight-semibold">Clearance</span>
      <Toggle bind:checked={clearing}>Reserve {CLEARANCE_PX}px at the bottom</Toggle>
      <div class="row wrap items-center gap-3">
        <Button size="sm" onclick={() => app.show({ title: 'Lifted while the clearance holds' })}>
          Show an app toast
        </Button>
      </div>
    </Card>
    <Card>
      <span class="eyebrow text-faint weight-semibold">Top region</span>
      <Toggle bind:checked={topShown}>Mount a top region for the app's toaster</Toggle>
      <div class="row wrap items-center gap-3">
        <Button
          size="sm"
          onclick={() =>
            app.show({
              title: 'Placed at the top',
              message: 'With no top region it falls back to the region attached last.',
              placement: 'top',
            })}
        >
          Show a toast at the top
        </Button>
      </div>
    </Card>
  </div>
</DemoSection>

{#if regionShown}
  <ToastRegion toaster={separate} dismissLabel="Dismiss" />
{/if}

{#if topShown}
  <ToastRegion placement="top" dismissLabel="Dismiss" />
{/if}

{#if clearing}
  <ToastClearance blockEnd={CLEARANCE_PX} />
{/if}
