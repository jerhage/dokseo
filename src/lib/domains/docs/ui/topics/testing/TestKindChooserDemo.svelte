<script lang="ts">
  import Alert from '$lib/components/Alert.svelte';
  import Field from '$lib/components/Field.svelte';
  import SegmentedControl from '$lib/components/SegmentedControl.svelte';
  import Select from '$lib/components/Select.svelte';
  import { BUG_PLACES, BUG_PRESETS, SIGHTINGS } from '../../../domain/test-kinds';
  import DocsDemo from '../../DocsDemo.svelte';
  import { TestKindChooser, adviceCard } from './testing-demos.svelte';

  const chooser = new TestKindChooser();

  const verdict = $derived(adviceCard(chooser.advice));
</script>

<DocsDemo label="Which test kind?">
  {#snippet caption()}
    The answer comes from <code>adviseTestKind</code>, a pure function over a named union with one
    arm per place. The examples are bugs and rules from Dokseo's history.
  {/snippet}
  <div class="stack-md">
    <Field label="A bug or rule from Dokseo">
      {#snippet children(control)}
        <Select
          {...control}
          value={chooser.preset ?? ''}
          onchange={(event) => chooser.usePresetKey(event.currentTarget.value)}
        >
          <option value="">None, describe it below</option>
          {#each BUG_PRESETS as preset (preset.key)}
            <option value={preset.key}>{preset.bug}</option>
          {/each}
        </Select>
      {/snippet}
    </Field>
    <Field label="Where does the bug live?">
      {#snippet children(control)}
        <Select
          {...control}
          value={chooser.place}
          onchange={(event) => chooser.choosePlace(event.currentTarget.value)}
        >
          {#each BUG_PLACES as place (place.value)}
            <option value={place.value}>{place.label}</option>
          {/each}
        </Select>
      {/snippet}
    </Field>
    <SegmentedControl
      label="Has it happened?"
      variant="track"
      options={SIGHTINGS}
      value={chooser.sighting}
      onvaluechange={(value) => chooser.chooseSighting(value)}
    />
    <Alert variant={verdict.variant} title={verdict.title}>
      {#if verdict.where !== null}
        <p class="m-0">Where: {verdict.where}.</p>
      {/if}
      <p class="m-0">{verdict.reason}</p>
    </Alert>
  </div>
</DocsDemo>
