<script lang="ts">
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
    readonly settings: ReadingSettings;
    readonly onchoose: (settings: ReadingSettings) => void;
    readonly onclose: () => void;
  };

  const { settings, onchoose, onclose }: Props = $props();

  const uid = $props.id();

  let dialog = $state<HTMLDialogElement | null>(null);
  let dismissed = false;

  $effect(() => {
    const node = dialog;
    if (node === null || node.open) return;

    node.showModal();
  });

  function dismiss(): void {
    if (dismissed) return;
    dismissed = true;
    onclose();
  }

  function backdrop(event: MouseEvent): void {
    if (event.target === dialog) dialog?.close();
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

<dialog bind:this={dialog} aria-labelledby="{uid}-heading" onclick={backdrop} onclose={dismiss}>
  <div class="panel">
    <div class="head">
      <h2 class="heading" id="{uid}-heading">{TEXT_SETTINGS_HEADING}</h2>
      <button class="close" type="button" onclick={() => dialog?.close()}>Close</button>
    </div>

    <fieldset class="group">
      <legend class="label">{TEXT_SIZE_LEGEND}</legend>
      {#each TEXT_SIZE_CHOICES as choice (choice.value)}
        <label class="choice">
          <input
            type="radio"
            name="{uid}-size"
            value={choice.value}
            checked={settings.textSize === choice.value}
            onchange={() => chooseSize(choice.value)}
          />
          <span>{choice.label}</span>
        </label>
      {/each}
    </fieldset>

    <fieldset class="group">
      <legend class="label">{LINE_SPACING_LEGEND}</legend>
      {#each LINE_SPACING_CHOICES as choice (choice.value)}
        <label class="choice">
          <input
            type="radio"
            name="{uid}-spacing"
            value={choice.value}
            checked={settings.lineSpacing === choice.value}
            onchange={() => chooseSpacing(choice.value)}
          />
          <span>{choice.label}</span>
        </label>
      {/each}
    </fieldset>

    <fieldset class="group">
      <legend class="label">Furigana</legend>
      <label class="choice">
        <input
          type="checkbox"
          checked={settings.showPhoneticReadings}
          onchange={(event) => chooseReadings(event.currentTarget.checked)}
        />
        <span>Show</span>
      </label>
    </fieldset>
  </div>
</dialog>

<style>
  dialog {
    width: min(360px, calc(100% - var(--s-5)));
    margin: auto;
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--c-border-3);
    border-radius: var(--r-7);
    background: var(--c-surface-popover);
    color: var(--c-text-2);
  }

  dialog::backdrop {
    background: color-mix(in srgb, var(--c-surface-void) 32%, transparent);
  }

  .panel {
    display: flex;
    flex-direction: column;
    gap: var(--s-4);
    padding: 0 var(--s-5) var(--s-5);
    font-family: var(--f-ui);
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-3);
    padding: var(--s-4) 0 var(--s-3);
    border-bottom: 1px solid var(--c-border-1);
  }

  .heading {
    margin: 0;
    color: var(--c-text-1);
    font-size: 15px;
    font-weight: 500;
  }

  .close {
    padding: var(--s-1) var(--s-3);
    border: 1px solid var(--c-border-4);
    border-radius: var(--r-4);
    background: var(--c-surface-button);
    color: var(--c-text-5);
    font-family: var(--f-ui);
    font-size: 12px;
    cursor: pointer;
  }

  .close:hover,
  .close:focus-visible {
    border-color: var(--c-accent-border);
    color: var(--c-accent);
  }

  .group {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-2) var(--s-4);
    margin: 0;
    padding: 0;
    border: 0;
  }

  .label {
    flex: 1 0 100%;
    margin-bottom: var(--s-1);
    padding: 0;
    color: var(--c-text-6);
    font-family: var(--f-ui);
    font-size: 11px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .choice {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    color: var(--c-text-4);
    font-size: 12.5px;
    cursor: pointer;
  }

  .choice input {
    width: 14px;
    height: 14px;
    margin: 0;
    accent-color: var(--c-accent);
  }
</style>
