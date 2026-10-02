<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Checkbox from '$lib/components/Checkbox.svelte';
  import Fieldset from '$lib/components/Fieldset.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import Radio from '$lib/components/Radio.svelte';
  import SegmentedControl from '$lib/components/SegmentedControl.svelte';
  import SettingsRow from '$lib/components/SettingsRow.svelte';
  import AppearanceSwitcher from '$lib/shared/AppearanceSwitcher.svelte';
  import { TOUCH_GUIDE_LABEL } from '$lib/shared/guide-kind';
  import { LANGUAGES, LANGUAGE_LEGEND, languageName } from '$lib/shared/language';
  import type { Language } from '$lib/shared/language';
  import type { ImageLayoutKind, PagePairing, ReadingDirection } from '$lib/shared/layout-kind';
  import {
    LAYOUT_KIND_CHOICES,
    LAYOUT_KIND_LEGEND_BRIEF,
    PAGE_PAIRING_CHOICES,
    PAGE_PAIRING_LEGEND,
    READING_DIRECTION_CHOICES,
    READING_DIRECTION_LEGEND,
  } from '$lib/shared/layout-choices';
  import { EDGE_CLICKS_LABEL } from '$lib/shared/edge-clicks-setting';
  import type { TouchTurns } from '$lib/shared/page-turn';
  import { TOUCH_TURNS_CHOICES, TOUCH_TURNS_LEGEND } from '$lib/shared/touch-turns';
  import type { ShownTurnSettings } from '$lib/shared/turn-settings';
  import { ALL_CAPTURES_LABEL } from './all-captures-setting';
  import { GESTURE_HINTS_LABEL } from './gesture-hints-setting';

  type FitChoice = {
    readonly label: string;
    readonly ready: boolean;
    readonly active: boolean;
    readonly go: () => void;
  };

  type Props = {
    open: boolean;
    readonly language: Language | null;
    readonly layout: ImageLayoutKind | null;
    readonly pairing: PagePairing | null;
    readonly direction: ReadingDirection | null;
    readonly saving: boolean;
    readonly downward: boolean;
    readonly fits: readonly FitChoice[];
    readonly offersAppearance: boolean;
    readonly turnSettings: ShownTurnSettings;
    readonly touchTurns: TouchTurns;
    readonly edgeClicksTurn: boolean;
    readonly gestureHints: boolean;
    readonly touchGuide: boolean;
    readonly allCaptures: boolean;
    readonly onlanguage: (language: Language) => void;
    readonly onlayout: (kind: ImageLayoutKind) => void;
    readonly onpairing: (pairing: PagePairing) => void;
    readonly ondirection: (direction: ReadingDirection) => void;
    readonly ontouchturns: (turns: TouchTurns) => void;
    readonly onedgeclicksturn: (wanted: boolean) => void;
    readonly ongesturehints: (wanted: boolean) => void;
    readonly ontouchguide: () => void;
    readonly onallcaptures: (wanted: boolean) => void;
  };

  let {
    open = $bindable(false),
    language,
    layout,
    pairing,
    direction,
    saving,
    downward,
    fits,
    offersAppearance,
    turnSettings,
    touchTurns,
    edgeClicksTurn,
    gestureHints,
    touchGuide,
    allCaptures,
    onlanguage,
    onlayout,
    onpairing,
    ondirection,
    ontouchturns,
    onedgeclicksturn,
    ongesturehints,
    ontouchguide,
    onallcaptures,
  }: Props = $props();

  const uid = $props.id();

  function showTouchGuide(): void {
    open = false;
    ontouchguide();
  }

  const stripHint = $derived(downward ? 'A strip reads top to bottom.' : undefined);
  const fitOptions = $derived(
    fits.map((choice) => ({ value: choice.label, label: choice.label, disabled: !choice.ready })),
  );
</script>

<Modal bind:open title="Reading settings" size="sm">
  <div class="col gap-5">
    <Fieldset legend={LANGUAGE_LEGEND} disabled={saving}>
      <div class="col gap-2">
        {#each LANGUAGES as choice (choice)}
          <Radio
            name="{uid}-language"
            value={choice}
            group={language}
            onchange={() => onlanguage(choice)}>{languageName(choice)}</Radio
          >
        {/each}
      </div>
    </Fieldset>

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

    {#if layout === 'paged' && (turnSettings.touchTurns || turnSettings.edgeClicks)}
      <Fieldset legend={TOUCH_TURNS_LEGEND}>
        <div class="col gap-2">
          {#if turnSettings.touchTurns}
            {#each TOUCH_TURNS_CHOICES as choice (choice.value)}
              <Radio
                name="{uid}-touch-turns"
                value={choice.value}
                group={touchTurns}
                onchange={() => ontouchturns(choice.value)}>{choice.label}</Radio
              >
            {/each}
          {/if}
          {#if turnSettings.edgeClicks}
            <Checkbox
              checked={edgeClicksTurn}
              onchange={(event) => onedgeclicksturn(event.currentTarget.checked)}
              >{EDGE_CLICKS_LABEL}</Checkbox
            >
          {/if}
        </div>
      </Fieldset>
    {/if}

    <Checkbox
      checked={gestureHints}
      onchange={(event) => ongesturehints(event.currentTarget.checked)}
      >{GESTURE_HINTS_LABEL}</Checkbox
    >

    {#if touchGuide}
      <div class="row">
        <Button size="sm" onclick={showTouchGuide}>{TOUCH_GUIDE_LABEL}</Button>
      </div>
    {/if}

    <Checkbox checked={allCaptures} onchange={(event) => onallcaptures(event.currentTarget.checked)}
      >{ALL_CAPTURES_LABEL}</Checkbox
    >

    {#if offersAppearance}
      <SettingsRow label="Appearance">
        <AppearanceSwitcher />
      </SettingsRow>
    {/if}
  </div>
</Modal>
