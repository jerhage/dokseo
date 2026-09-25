<script lang="ts">
  import Fieldset from '$lib/components/Fieldset.svelte';
  import Radio from '$lib/components/Radio.svelte';
  import { readAppearance } from '$lib/shared/appearance';
  import type { Appearance } from '$lib/shared/appearance';
  import { chooseAppearance } from '$lib/shared/saved-appearance';
  import { SCHEME_OPTIONS, THEME_OPTIONS } from './appearance-options';

  const uid = $props.id();

  let appearance = $state<Appearance>(readAppearance(document.documentElement));

  function choose(next: Appearance): void {
    appearance = next;
    chooseAppearance(document.documentElement, next);
  }
</script>

<div class="col gap-6 prose">
  <header class="col gap-1">
    <h1 class="text-lg">Appearance</h1>
    <p class="text-sm text-muted">
      The theme and color scheme of this app. The choice is kept in this browser and applied before
      the first paint, so no page flashes the wrong colors.
    </p>
  </header>

  <section class="surface bordered rounded-container p-5">
    <Fieldset legend="Theme">
      <div class="grid-3 grid-auto-sm">
        {#each THEME_OPTIONS as option (option.theme)}
          <Radio
            name="{uid}-theme"
            value={option.theme}
            group={appearance.theme}
            class="surface-sunken rounded-control px-3 py-2"
            onchange={() => choose({ ...appearance, theme: option.theme })}
          >
            {option.label}
          </Radio>
        {/each}
      </div>
    </Fieldset>
  </section>

  <section class="surface bordered rounded-container p-5">
    <Fieldset legend="Color scheme">
      <div class="col gap-3">
        {#each SCHEME_OPTIONS as option (option.colorScheme)}
          <Radio
            name="{uid}-scheme"
            value={option.colorScheme}
            group={appearance.colorScheme}
            hint={option.hint}
            onchange={() => choose({ ...appearance, colorScheme: option.colorScheme })}
          >
            {option.label}
          </Radio>
        {/each}
      </div>
    </Fieldset>
  </section>
</div>
