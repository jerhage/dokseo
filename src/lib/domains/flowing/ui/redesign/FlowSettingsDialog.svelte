<script lang="ts">
  import Checkbox from '$lib/components/Checkbox.svelte';
  import Fieldset from '$lib/components/Fieldset.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import Radio from '$lib/components/Radio.svelte';
  import AppearanceSwitcher from '$lib/shared/AppearanceSwitcher.svelte';
  import {
    LINE_SPACING_CHOICES,
    LINE_SPACING_LEGEND,
    TEXT_SETTINGS_HEADING,
    TEXT_SIZE_CHOICES,
    TEXT_SIZE_LEGEND,
    withLineSpacing,
    withPhoneticReadings,
    withTextSize,
  } from '../../domain/reading-settings';
  import type { LineSpacing, ReadingSettings, TextSize } from '../../domain/reading-settings';

  type Props = {
    open: boolean;
    readonly settings: ReadingSettings;
    readonly onchoose: (settings: ReadingSettings) => void;
    readonly offersAppearance?: boolean;
  };

  let { open = $bindable(false), settings, onchoose, offersAppearance = false }: Props = $props();

  const uid = $props.id();

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

<Modal bind:open title={TEXT_SETTINGS_HEADING} size="sm">
  <div class="col gap-5">
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

    <Fieldset legend="Furigana">
      <Checkbox
        checked={settings.showPhoneticReadings}
        onchange={(event) => chooseReadings(event.currentTarget.checked)}>Show</Checkbox
      >
    </Fieldset>

    {#if offersAppearance}
      <div class="row items-center justify-between" role="group" aria-labelledby="{uid}-appearance">
        <span class="fieldset-legend mb-0" id="{uid}-appearance">Appearance</span>
        <AppearanceSwitcher />
      </div>
    {/if}
  </div>
</Modal>
