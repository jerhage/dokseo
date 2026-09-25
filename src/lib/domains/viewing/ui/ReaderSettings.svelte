<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Fieldset from '$lib/components/Fieldset.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import Radio from '$lib/components/Radio.svelte';
  import AppearanceSwitcher from '$lib/shared/AppearanceSwitcher.svelte';
  import type { ImageLayoutKind, PagePairing, ReadingDirection } from '$lib/shared/layout-kind';
  import {
    LAYOUT_KIND_CHOICES,
    LAYOUT_KIND_LEGEND_BRIEF,
    PAGE_PAIRING_CHOICES,
    PAGE_PAIRING_LEGEND,
    READING_DIRECTION_CHOICES,
    READING_DIRECTION_LEGEND,
  } from '$lib/shared/layout-choices';

  type FitChoice = {
    readonly label: string;
    readonly ready: boolean;
    readonly active: boolean;
    readonly go: () => void;
  };

  type Props = {
    open: boolean;
    readonly layout: ImageLayoutKind | null;
    readonly pairing: PagePairing | null;
    readonly direction: ReadingDirection | null;
    readonly saving: boolean;
    readonly downward: boolean;
    readonly fits: readonly FitChoice[];
    readonly offersAppearance: boolean;
    readonly onlayout: (kind: ImageLayoutKind) => void;
    readonly onpairing: (pairing: PagePairing) => void;
    readonly ondirection: (direction: ReadingDirection) => void;
  };

  let {
    open = $bindable(false),
    layout,
    pairing,
    direction,
    saving,
    downward,
    fits,
    offersAppearance,
    onlayout,
    onpairing,
    ondirection,
  }: Props = $props();

  const uid = $props.id();

  const stripHint = $derived(downward ? 'A strip reads top to bottom.' : undefined);
</script>

<Modal bind:open title="Reading settings" size="sm">
  <div class="col gap-5">
    <Fieldset legend={LAYOUT_KIND_LEGEND_BRIEF} disabled={saving}>
      <div class="col gap-2">
        {#each LAYOUT_KIND_CHOICES as choice (choice.value)}
          <Radio
            name="{uid}-layout"
            value={choice.value}
            group={layout}
            onchange={() => onlayout(choice.value)}>{choice.label}</Radio
          >
        {/each}
      </div>
    </Fieldset>

    <Fieldset legend={PAGE_PAIRING_LEGEND} hint={stripHint} disabled={saving || downward}>
      <div class="col gap-2">
        {#each PAGE_PAIRING_CHOICES as choice (choice.value)}
          <Radio
            name="{uid}-pairing"
            value={choice.value}
            group={pairing}
            onchange={() => onpairing(choice.value)}>{choice.label}</Radio
          >
        {/each}
      </div>
    </Fieldset>

    <Fieldset legend={READING_DIRECTION_LEGEND} hint={stripHint} disabled={saving || downward}>
      <div class="col gap-2">
        {#each READING_DIRECTION_CHOICES as choice (choice.value)}
          <Radio
            name="{uid}-direction"
            value={choice.value}
            group={direction}
            onchange={() => ondirection(choice.value)}>{choice.label}</Radio
          >
        {/each}
      </div>
    </Fieldset>

    <div class="fieldset" role="group" aria-labelledby="{uid}-fit">
      <span class="fieldset-legend" id="{uid}-fit">Fit</span>
      <div class="row wrap gap-2">
        {#each fits as choice (choice.label)}
          <Button
            size="sm"
            disabled={!choice.ready}
            active={choice.active}
            aria-pressed={choice.active}
            onclick={choice.go}
          >
            {choice.label}
          </Button>
        {/each}
      </div>
    </div>

    {#if offersAppearance}
      <div class="row items-center justify-between" role="group" aria-labelledby="{uid}-appearance">
        <span class="fieldset-legend mb-0" id="{uid}-appearance">Appearance</span>
        <AppearanceSwitcher />
      </div>
    {/if}
  </div>
</Modal>
