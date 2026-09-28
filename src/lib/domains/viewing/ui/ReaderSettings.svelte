<script lang="ts">
  import Checkbox from '$lib/components/Checkbox.svelte';
  import Fieldset from '$lib/components/Fieldset.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import Radio from '$lib/components/Radio.svelte';
  import SegmentedControl from '$lib/components/SegmentedControl.svelte';
  import SettingsRow from '$lib/components/SettingsRow.svelte';
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
  import type { TouchTurns } from '$lib/shared/page-turn';
  import { TOUCH_TURNS_CHOICES, TOUCH_TURNS_LEGEND } from '$lib/shared/touch-turns';
  import { GESTURE_HINTS_LABEL } from './gesture-hints-setting';

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
    readonly touchTurns: TouchTurns;
    readonly gestureHints: boolean;
    readonly onlayout: (kind: ImageLayoutKind) => void;
    readonly onpairing: (pairing: PagePairing) => void;
    readonly ondirection: (direction: ReadingDirection) => void;
    readonly ontouchturns: (turns: TouchTurns) => void;
    readonly ongesturehints: (wanted: boolean) => void;
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
    touchTurns,
    gestureHints,
    onlayout,
    onpairing,
    ondirection,
    ontouchturns,
    ongesturehints,
  }: Props = $props();

  const uid = $props.id();

  const stripHint = $derived(downward ? 'A strip reads top to bottom.' : undefined);
  const fitOptions = $derived(
    fits.map((choice) => ({ value: choice.label, label: choice.label, disabled: !choice.ready })),
  );
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

    <Fieldset legend="Fit">
      <SegmentedControl
        class="row wrap gap-2"
        options={fitOptions}
        value={fits.find((choice) => choice.active)?.label}
        onvaluechange={(label) => fits.find((choice) => choice.label === label)?.go()}
      />
    </Fieldset>

    {#if layout === 'paged'}
      <Fieldset legend={TOUCH_TURNS_LEGEND}>
        <div class="col gap-2">
          {#each TOUCH_TURNS_CHOICES as choice (choice.value)}
            <Radio
              name="{uid}-touch-turns"
              value={choice.value}
              group={touchTurns}
              onchange={() => ontouchturns(choice.value)}>{choice.label}</Radio
            >
          {/each}
        </div>
      </Fieldset>
    {/if}

    <Checkbox
      checked={gestureHints}
      onchange={(event) => ongesturehints(event.currentTarget.checked)}
      >{GESTURE_HINTS_LABEL}</Checkbox
    >

    {#if offersAppearance}
      <SettingsRow label="Appearance">
        <AppearanceSwitcher />
      </SettingsRow>
    {/if}
  </div>
</Modal>
