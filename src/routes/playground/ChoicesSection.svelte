<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import Checkbox from '$lib/components/Checkbox.svelte';
  import Fieldset from '$lib/components/Fieldset.svelte';
  import Radio from '$lib/components/Radio.svelte';
  import SettingsRow from '$lib/components/SettingsRow.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import DemoSection from './DemoSection.svelte';

  const uid = $props.id();

  let digests = $state(true);
  let mentions = $state(false);
  let partial = $state(true);
  let plan = $state('monthly');
  let size = $state('medium');
  let autosave = $state(true);
  let publicLink = $state(false);
  let density = $state('Comfortable');
</script>

<DemoSection
  id="choice"
  title="Checkbox, radio and toggle"
  classes={[
    'fieldset',
    'settings-row',
    'checkbox-wrapper',
    'radio-wrapper',
    'radio-tile',
    'toggle',
  ]}
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
      <Fieldset legend="Radio tile" hint="The whole tile picks it.">
        <div class="grid-3 grid-auto-sm">
          <Radio name="size" value="small" bind:group={size} variant="tile">Small</Radio>
          <Radio name="size" value="medium" bind:group={size} variant="tile" hint="Most books."
            >Medium</Radio
          >
          <Radio name="size" value="large" bind:group={size} variant="tile" disabled>Large</Radio>
        </div>
        <p class="text-sm text-muted">Size: {size}</p>
      </Fieldset>
    </Card>
    <Card>
      <Fieldset legend="Radio named from elsewhere">
        <div class="row items-center gap-2">
          <Radio name="{uid}-engine" value="here" group="here" aria-labelledby="{uid}-here" />
          <h3 class="text-base weight-semibold" id="{uid}-here">On this device</h3>
        </div>
        <div class="row items-center gap-2">
          <Radio
            name="{uid}-engine"
            value="server"
            group="here"
            disabled
            aria-labelledby="{uid}-server"
          />
          <h3 class="text-base weight-semibold" id="{uid}-server">On a server</h3>
        </div>
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
