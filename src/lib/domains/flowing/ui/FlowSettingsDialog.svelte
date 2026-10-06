<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';
  import Checkbox from '$lib/ui/components/Checkbox.svelte';
  import Fieldset from '$lib/ui/components/Fieldset.svelte';
  import Modal from '$lib/ui/components/Modal.svelte';
  import Radio from '$lib/ui/components/Radio.svelte';
  import SettingsRow from '$lib/ui/components/SettingsRow.svelte';
  import AppearanceSwitcher from '$lib/shared/AppearanceSwitcher.svelte';
  import PageTurnSettings from '$lib/shared/PageTurnSettings.svelte';
  import { TOUCH_GUIDE_LABEL } from '$lib/shared/guide-kind';
  import { LANGUAGES, LANGUAGE_LEGEND, languageName } from '$lib/shared/language';
  import type { Language } from '$lib/shared/language';
  import type { TouchTurns } from '$lib/shared/page-turn';
  import type { ShownTurnSettings } from '$lib/shared/turn-settings';
  import {
    LINE_SPACING_CHOICES,
    LINE_SPACING_LEGEND,
    TEXT_SETTINGS_HEADING,
    TEXT_SIZE_CHOICES,
    TEXT_SIZE_LEGEND,
    withLineSpacing,
    withPhoneticReadings,
    withTextSize,
  } from '../domain/reading-settings';
  import type { LineSpacing, ReadingSettings, TextSize } from '../domain/reading-settings';

  type Props = {
    open: boolean;
    readonly settings: ReadingSettings;
    readonly onchoose: (settings: ReadingSettings) => void;
    readonly offersAppearance?: boolean;
    readonly language?: Language | null;
    readonly saving?: boolean;
    readonly onlanguage?: ((language: Language) => void) | undefined;
    readonly touchGuide?: boolean;
    readonly ontouchguide?: (() => void) | undefined;
    readonly turnSettings: ShownTurnSettings;
    readonly touchTurns: TouchTurns;
    readonly edgeClicksTurn: boolean;
    readonly ontouchturns: (turns: TouchTurns) => void;
    readonly onedgeclicksturn: (wanted: boolean) => void;
  };

  let {
    open = $bindable(false),
    settings,
    onchoose,
    offersAppearance = false,
    language = null,
    saving = false,
    onlanguage,
    touchGuide = false,
    ontouchguide,
    turnSettings,
    touchTurns,
    edgeClicksTurn,
    ontouchturns,
    onedgeclicksturn,
  }: Props = $props();

  const uid = $props.id();

  function showTouchGuide(): void {
    open = false;
    ontouchguide?.();
  }

  function chooseSize(size: TextSize): void {
    onchoose(withTextSize(settings, size));
  }

  function chooseSpacing(spacing: LineSpacing): void {
    onchoose(withLineSpacing(settings, spacing));
  }

  function chooseReadings(shown: boolean): void {
    onchoose(withPhoneticReadings(settings, shown));
  }
</script>

<Modal bind:open title={TEXT_SETTINGS_HEADING} size="sm" sheetNarrow>
  <div class="col gap-5">
    <Fieldset legend={LANGUAGE_LEGEND} disabled={saving}>
      <div class="col gap-2">
        {#each LANGUAGES as choice (choice)}
          <Radio
            name="{uid}-language"
            value={choice}
            group={language}
            onchange={() => onlanguage?.(choice)}>{languageName(choice)}</Radio
          >
        {/each}
      </div>
    </Fieldset>

    <Fieldset legend={TEXT_SIZE_LEGEND}>
      <div class="row wrap gap-3">
        {#each TEXT_SIZE_CHOICES as choice (choice.value)}
          <Radio
            name="{uid}-size"
            value={choice.value}
            group={settings.textSize}
            onchange={() => chooseSize(choice.value)}>{choice.label}</Radio
          >
        {/each}
      </div>
    </Fieldset>

    <Fieldset legend={LINE_SPACING_LEGEND}>
      <div class="row wrap gap-3">
        {#each LINE_SPACING_CHOICES as choice (choice.value)}
          <Radio
            name="{uid}-spacing"
            value={choice.value}
            group={settings.lineSpacing}
            onchange={() => chooseSpacing(choice.value)}>{choice.label}</Radio
          >
        {/each}
      </div>
    </Fieldset>

    <Fieldset legend="Furigana / Hanja">
      <Checkbox
        checked={settings.showPhoneticReadings}
        onchange={(event) => chooseReadings(event.currentTarget.checked)}>Show</Checkbox
      >
    </Fieldset>

    <PageTurnSettings
      shown={turnSettings}
      {touchTurns}
      {edgeClicksTurn}
      {ontouchturns}
      {onedgeclicksturn}
    />

    {#if touchGuide && ontouchguide !== undefined}
      <div class="row">
        <Button size="sm" onclick={showTouchGuide}>{TOUCH_GUIDE_LABEL}</Button>
      </div>
    {/if}

    {#if offersAppearance}
      <SettingsRow label="Appearance">
        <AppearanceSwitcher />
      </SettingsRow>
    {/if}
  </div>
</Modal>
