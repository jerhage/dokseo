<script lang="ts">
  import Fieldset from '$lib/ui/components/Fieldset.svelte';
  import Radio from '$lib/ui/components/Radio.svelte';
  import { LANGUAGES, languageName } from '$lib/shared/language';
  import {
    LAYOUT_KIND_CHOICES,
    LAYOUT_KIND_LEGEND_BRIEF,
    PAGE_PAIRING_CHOICES,
    PAGE_PAIRING_LEGEND,
    READING_DIRECTION_CHOICES,
    READING_DIRECTION_LEGEND,
  } from '$lib/shared/layout-choices';
  import {
    chooseDefaultDirection,
    chooseDefaultLanguage,
    chooseDefaultLayout,
    chooseDefaultPairing,
    readingDefaultsChosen,
  } from './reading-defaults.svelte';

  const uid = $props.id();

  const defaults = $derived(readingDefaultsChosen());
</script>

<div class="col gap-6 prose">
  <header class="col gap-1">
    <h1 class="text-lg">Reading defaults</h1>
    <p class="text-sm text-muted">
      What a book you add starts with. Where its file says otherwise, the file wins: an EPUB keeps
      its own language, direction and layout. Books you already have keep their settings.
    </p>
  </header>

  <section class="surface bordered rounded-container p-5">
    <Fieldset
      legend="Default language"
      hint="For a book whose language neither its file nor its title shows."
    >
      <div class="row wrap gap-4">
        {#each LANGUAGES as language (language)}
          <Radio
            name="{uid}-language"
            value={language}
            group={defaults.language}
            onchange={() => chooseDefaultLanguage(language)}>{languageName(language)}</Radio
          >
        {/each}
      </div>
    </Fieldset>
  </section>

  {#each LANGUAGES as language (language)}
    {@const chosen = defaults.languages[language]}
    <section
      class="surface bordered rounded-container p-5"
      aria-labelledby="{uid}-{language}-heading"
    >
      <div class="col gap-5">
        <h2 id="{uid}-{language}-heading" class="text-base weight-semibold">
          {languageName(language)}
        </h2>

        <Fieldset legend={READING_DIRECTION_LEGEND}>
          <div class="col gap-2">
            {#each READING_DIRECTION_CHOICES as choice (choice.value)}
              <Radio
                name="{uid}-{language}-direction"
                value={choice.value}
                group={chosen.direction}
                onchange={() => chooseDefaultDirection(language, choice.value)}
                >{choice.label}</Radio
              >
            {/each}
          </div>
        </Fieldset>

        <Fieldset legend={LAYOUT_KIND_LEGEND_BRIEF} hint="For image books. A reflowing EPUB flows.">
          <div class="col gap-2">
            {#each LAYOUT_KIND_CHOICES as choice (choice.value)}
              <Radio
                name="{uid}-{language}-layout"
                value={choice.value}
                group={chosen.layoutKind}
                onchange={() => chooseDefaultLayout(language, choice.value)}>{choice.label}</Radio
              >
            {/each}
          </div>
        </Fieldset>

        <Fieldset legend={PAGE_PAIRING_LEGEND}>
          <div class="col gap-2">
            {#each PAGE_PAIRING_CHOICES as choice (choice.value)}
              <Radio
                name="{uid}-{language}-pairing"
                value={choice.value}
                group={chosen.pagePairing}
                onchange={() => chooseDefaultPairing(language, choice.value)}>{choice.label}</Radio
              >
            {/each}
          </div>
        </Fieldset>
      </div>
    </section>
  {/each}
</div>
