<script lang="ts">
  import Alert from '$lib/components/Alert.svelte';
  import Field from '$lib/components/Field.svelte';
  import Select from '$lib/components/Select.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import {
    DAMAGE_OPTIONS,
    FIXTURES,
    damageSummary,
    damagedRow,
    fieldsOf,
    fixtureById,
    readDamaged,
    shownValue,
    valueAt,
  } from './damage';
  import type { Damage } from './damage';

  const [firstFixture] = FIXTURES;

  let fixtureId = $state(firstFixture?.id ?? '');
  let field = $state('language');
  let damage = $state<Damage>('text');

  const fixture = $derived(fixtureById(fixtureId));
  const fields = $derived(fieldsOf(fixture));
  const row = $derived(damagedRow(fixture.row, field, damage));
  const summary = $derived(damageSummary(fixture, readDamaged(fixture, row)));
  const before = $derived(shownValue(valueAt(fixture.row, field)));
  const after = $derived(shownValue(valueAt(row, field)));

  function chooseFixture(event: Event & { currentTarget: HTMLSelectElement }): void {
    fixtureId = event.currentTarget.value;
    field = fieldsOf(fixtureById(fixtureId))[0] ?? '';
  }

  function chooseDamage(event: Event & { currentTarget: HTMLSelectElement }): void {
    const chosen = DAMAGE_OPTIONS.find((option) => option.damage === event.currentTarget.value);
    if (chosen !== undefined) damage = chosen.damage;
  }
</script>

<DocsDemo label="Damage one field of a frozen row" resettable>
  <div class="grid-auto gap-3">
    <Field label="Fixture">
      {#snippet children(control)}
        <Select {...control} value={fixtureId} onchange={chooseFixture}>
          {#each FIXTURES as option (option.id)}
            <option value={option.id}>{option.label}</option>
          {/each}
        </Select>
      {/snippet}
    </Field>
    <Field label="Field">
      {#snippet children(control)}
        <Select {...control} bind:value={field}>
          {#each fields as path (path)}
            <option value={path}>{path}</option>
          {/each}
        </Select>
      {/snippet}
    </Field>
    <Field label="Damage">
      {#snippet children(control)}
        <Select {...control} value={damage} onchange={chooseDamage}>
          {#each DAMAGE_OPTIONS as option (option.damage)}
            <option value={option.damage}>{option.label}</option>
          {/each}
        </Select>
      {/snippet}
    </Field>
  </div>
  <p class="mono text-sm m-0">{field}: {before} → {after}</p>
  <Alert variant={summary.variant} title={summary.title}>{summary.text}</Alert>
  {#snippet caption()}
    The damaged copy goes through the real mapper for its record kind, and through the real list
    reader to see whether the app can list it on its own. A field inside a list of regions is
    damaged in the first region. Nothing is written to IndexedDB.
  {/snippet}
</DocsDemo>
