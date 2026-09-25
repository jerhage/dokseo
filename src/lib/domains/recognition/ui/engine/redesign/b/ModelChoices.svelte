<script lang="ts">
  import Field from '$lib/components/Field.svelte';
  import Radio from '$lib/components/Radio.svelte';
  import Select from '$lib/components/Select.svelte';
  import { languageName } from '$lib/shared/language';
  import type { Language } from '$lib/shared/language';
  import type { ModelFootprint } from '../../../../domain/model/model-footprint';
  import { engineLanguages } from '../../engine-settings.svelte';
  import type { EngineSettingsView } from '../../engine-settings.svelte';
  import { languageFrom, modelHint } from './engine-page';

  type Props = {
    readonly view: EngineSettingsView;
    readonly model: ModelFootprint;
    readonly language: Language;
  };

  let { view, model, language }: Props = $props();

  const uid = $props.id();

  const languages = engineLanguages();

  function speak(value: string): void {
    const chosen = languageFrom(value, languages);
    if (chosen !== null) void view.chooseLanguage(chosen);
  }
</script>

<section class="col gap-2" aria-labelledby="{uid}-heading">
  <h2 id="{uid}-heading" class="px-1 text-xs uppercase tracking-wide text-muted weight-semibold">
    Language and model
  </h2>
  <div class="surface bordered rounded-container overflow-hidden">
    <Field
      label="Language"
      hint="The model, the compute and the download on this page are for this language."
      class="px-4 py-3"
    >
      {#snippet children(control)}
        <Select
          {...control}
          value={language}
          onchange={(event) => speak(event.currentTarget.value)}
        >
          {#each languages as offered (offered)}
            <option value={offered}>{languageName(offered)}</option>
          {/each}
        </Select>
      {/snippet}
    </Field>
    <div class="col gap-0 border-t" role="radiogroup" aria-labelledby="{uid}-models">
      <p id="{uid}-models" class="px-4 pt-3 text-sm weight-semibold">Model</p>
      <ul class="list-reset">
        {#each view.models as offered, index (offered.modelId)}
          <li class={['px-4 py-3', { 'border-t': index > 0 }]}>
            <Radio
              name="{uid}-model-choice"
              value={offered.modelId}
              group={model.modelId}
              hint={modelHint(offered)}
              onchange={() => void view.chooseModel(offered.modelId)}
            >
              {offered.label}
            </Radio>
          </li>
        {/each}
      </ul>
    </div>
  </div>
</section>
