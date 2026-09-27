<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import Checkbox from '$lib/components/Checkbox.svelte';
  import Fieldset from '$lib/components/Fieldset.svelte';
  import Radio from '$lib/components/Radio.svelte';
  import SettingsRow from '$lib/components/SettingsRow.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import DemoSection from './DemoSection.svelte';

  let digests = $state(true);
  let mentions = $state(false);
  let partial = $state(true);
  let plan = $state('monthly');
  let autosave = $state(true);
  let publicLink = $state(false);
  let density = $state('Comfortable');
</script>

<DemoSection
  id="choice"
  title="Checkbox, radio and toggle"
  classes={['fieldset', 'settings-row', 'checkbox-wrapper', 'radio-wrapper', 'toggle']}
>
  <div class="grid-3">
    <Card>
      <Fieldset legend="Checkbox">
        <Checkbox bind:checked={digests}>Email digests</Checkbox>
        <Checkbox bind:checked={mentions} hint="Only when someone tags you directly."
          >Mentions</Checkbox
        >
        <Checkbox bind:indeterminate={partial}>Select all (partial)</Checkbox>
        <Checkbox disabled>Disabled</Checkbox>
        <Checkbox checked disabled>Checked and disabled</Checkbox>
      </Fieldset>
    </Card>
    <Card>
      <Fieldset legend="Radio" hint="Change it at any time.">
        <Radio name="plan" value="monthly" bind:group={plan}>Monthly</Radio>
        <Radio name="plan" value="yearly" bind:group={plan} hint="Two months free.">Yearly</Radio>
        <Radio name="plan" value="lifetime" bind:group={plan} disabled>Lifetime (unavailable)</Radio
        >
        <p class="text-sm text-muted">Plan: {plan}</p>
      </Fieldset>
    </Card>
    <Card>
      <Fieldset legend="Toggle">
        <Toggle bind:checked={autosave}>Autosave</Toggle>
        <Toggle bind:checked={publicLink}>Public link</Toggle>
        <Toggle disabled>SSO (Enterprise)</Toggle>
        <Toggle checked disabled>Enforced</Toggle>
      </Fieldset>
    </Card>
    <Card>
      <SettingsRow label="Density">
        <div class="row gap-2">
          {#each ['Compact', 'Comfortable'] as choice (choice)}
            <Button
              size="sm"
              active={density === choice}
              aria-pressed={density === choice}
              onclick={() => (density = choice)}>{choice}</Button
            >
          {/each}
        </div>
      </SettingsRow>
    </Card>
  </div>
</DemoSection>
