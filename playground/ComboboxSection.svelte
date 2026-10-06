<script lang="ts">
  import Card from '../components/Card.svelte';
  import Combobox from '../components/Combobox.svelte';
  import type { ComboboxOption } from '../components/combobox';
  import DemoSection from './DemoSection.svelte';

  const LANGUAGES: readonly ComboboxOption[] = [
    { value: 'ja', label: 'Japanese' },
    { value: 'ko', label: 'Korean' },
    { value: 'zh', label: 'Chinese' },
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'es', label: 'Spanish' },
    { value: 'it', label: 'Italian' },
    { value: 'pt', label: 'Portuguese' },
    { value: 'ru', label: 'Russian' },
  ];

  let language = $state<string>();
</script>

<DemoSection
  id="combobox"
  title="Combobox"
  classes={['combobox', 'combobox-listbox', 'combobox-option', 'combobox-empty']}
>
  <Card>
    <p class="text-sm text-muted">
      A text field with a list of options. Typing filters the list; the arrow keys move the active
      option and Enter chooses it. Leaving the field puts the chosen label back.
    </p>
    <div class="grid-auto">
      <Combobox
        label="Language"
        options={LANGUAGES}
        bind:value={language}
        placeholder="Type a language"
      />
      <Combobox label="Preset" options={LANGUAGES} value="ko" />
      <Combobox label="Locked" options={LANGUAGES} value="en" disabled />
    </div>
    <p class="text-xs text-muted">Chosen: {language ?? 'nothing yet'}</p>
  </Card>
</DemoSection>
