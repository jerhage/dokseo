<script lang="ts">
  import Alert from '$lib/ui/components/Alert.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Field from '$lib/ui/components/Field.svelte';
  import Select from '$lib/ui/components/Select.svelte';
  import Textarea from '$lib/ui/components/Textarea.svelte';
  import { markupVerdict, normalizedMarkup } from '../../../domain/markup-contract';
  import DocsCode from '../../DocsCode.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import { CONTRACT_CASES, contractCase } from './contract-cases';
  import type { ContractCaseId } from './contract-cases';
  import {
    FIXTURE_EDITS,
    checkSummary,
    contractCaseId,
    editedFixture,
    fixtureEdit,
  } from './contract-check';
  import type { ContractCheck, FixtureEdit } from './contract-check';
  import { mountedMarkup } from './contract-mount';

  let caseId = $state<ContractCaseId>('badge-success');
  let edit = $state<FixtureEdit>('as-written');
  let fixture = $state(contractCase('badge-success').fixture);
  let check = $state<ContractCheck>({ kind: 'not-run' });
  let rendered = $state('');

  const chosen = $derived(contractCase(caseId));
  const summary = $derived(checkSummary(check));
  const shownBlocks = $derived([
    { label: 'What the component rendered in the browser', code: rendered },
    { label: 'The component, normalized', code: normalizedMarkup(rendered) },
    { label: 'The fixture, normalized', code: normalizedMarkup(fixture) },
  ]);

  function chooseCase(event: Event & { currentTarget: HTMLSelectElement }): void {
    const id = contractCaseId(event.currentTarget.value);
    if (id === undefined) return;
    caseId = id;
    edit = 'as-written';
    fixture = contractCase(id).fixture;
    check = { kind: 'not-run' };
    rendered = '';
  }

  function chooseEdit(event: Event & { currentTarget: HTMLSelectElement }): void {
    const picked = fixtureEdit(event.currentTarget.value);
    if (picked === undefined) return;
    edit = picked;
    fixture = editedFixture(chosen.fixture, picked);
    check = { kind: 'not-run' };
  }

  function edited(): void {
    check = { kind: 'not-run' };
  }

  function runCheck(): void {
    rendered = chosen.markup(mountedMarkup);
    check = markupVerdict(rendered, fixture);
  }
</script>

<DocsDemo label="Check a fixture against the real component">
  <div class="stack-md">
    <div class="grid-auto gap-3">
      <Field label="Component and variant">
        {#snippet children(control)}
          <Select {...control} value={caseId} onchange={chooseCase}>
            {#each CONTRACT_CASES as option (option.id)}
              <option value={option.id}>{option.label}</option>
            {/each}
          </Select>
        {/snippet}
      </Field>
      <Field label="Change the fixture">
        {#snippet children(control)}
          <Select {...control} value={edit} onchange={chooseEdit}>
            {#each FIXTURE_EDITS as option (option.edit)}
              <option value={option.edit}>{option.label}</option>
            {/each}
          </Select>
        {/snippet}
      </Field>
    </div>
    <p class="m-0 text-sm text-muted">Svelte call: <code>{chosen.call}</code></p>
    <Field label="The fixture, editable">
      {#snippet children(control)}
        <Textarea
          {...control}
          class="mono text-xs"
          rows={8}
          spellcheck="false"
          bind:value={fixture}
          oninput={edited}
        />
      {/snippet}
    </Field>
    <div class="row wrap gap-2">
      <Button variant="primary" size="sm" onclick={runCheck}>Run the contract check</Button>
    </div>
    <div aria-live="polite">
      <Alert variant={summary.variant} title={summary.title}>{summary.text}</Alert>
    </div>
    {#if rendered !== ''}
      {#each shownBlocks as shown (shown.label)}
        <div class="stack-sm">
          <p class="m-0 text-sm text-muted">{shown.label}</p>
          <DocsCode label={shown.label} code={shown.code} />
        </div>
      {/each}
    {/if}
  </div>
  {#snippet caption()}
    The check mounts the real Kandan component into a detached element with Svelte's
    <code>mount</code>, reads its HTML, and compares it with the fixture through the same
    <code>normalizedMarkup</code> the spec uses. Nothing is added to the page.
  {/snippet}
</DocsDemo>
