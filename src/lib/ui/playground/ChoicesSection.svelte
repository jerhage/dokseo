<script lang="ts">
  import Card from '../components/Card.svelte';
  import Checkbox from '../components/Checkbox.svelte';
  import Fieldset from '../components/Fieldset.svelte';
  import Radio from '../components/Radio.svelte';
  import type { SegmentOption } from '../components/segmented-control';
  import SegmentedControl from '../components/SegmentedControl.svelte';
  import SettingsRow from '../components/SettingsRow.svelte';
  import Toggle from '../components/Toggle.svelte';
  import DemoSection from './DemoSection.svelte';

  type Density = 'Compact' | 'Comfortable';

  const DENSITIES: readonly SegmentOption<Density>[] = [
    { value: 'Compact', label: 'Compact' },
    { value: 'Comfortable', label: 'Comfortable' },
  ];

  const uid = $props.id();

  let digests = $state(true);
  let mentions = $state(false);
  let partial = $state(true);
  let plan = $state('monthly');
  let size = $state('medium');
  let autosave = $state(true);
  let publicLink = $state(false);
  let density = $state<Density>('Comfortable');
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
        <SegmentedControl options={DENSITIES} bind:value={density} class="gap-2" />
      </SettingsRow>
    </Card>
  </div>
</DemoSection>
