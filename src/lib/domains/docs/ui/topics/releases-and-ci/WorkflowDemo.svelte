<script lang="ts">
  import { match } from 'ts-pattern';
  import Badge from '$lib/ui/components/Badge.svelte';
  import Field from '$lib/ui/components/Field.svelte';
  import Select from '$lib/ui/components/Select.svelte';
  import type { BadgeVariant } from '$lib/ui/components/classes';
  import {
    JOB_CONDITIONS,
    REPO_EVENTS,
    eventFacts,
    workflowRuns,
  } from '../../../domain/release-workflow';
  import type { JobOutcome, RepoEvent } from '../../../domain/release-workflow';
  import DocsDemo from '../../DocsDemo.svelte';

  type OutcomeLook = {
    readonly variant: BadgeVariant;
    readonly label: string;
    readonly text: string;
  };

  let event = $state<RepoEvent>('main-push');

  const facts = $derived(eventFacts(event));
  const runs = $derived(
    workflowRuns(event).map((run) => ({ job: run.job, look: outcomeLook(run.outcome) })),
  );

  function outcomeLook(outcome: JobOutcome): OutcomeLook {
    return match<JobOutcome, OutcomeLook>(outcome)
      .with({ kind: 'runs' }, ({ does }) => ({ variant: 'success', label: 'Runs', text: does }))
      .with({ kind: 'skipped' }, ({ why }) => ({ variant: 'neutral', label: 'Skipped', text: why }))
      .with({ kind: 'awaits-approval' }, ({ why }) => ({
        variant: 'warning',
        label: 'Waits for approval',
        text: why,
      }))
      .with({ kind: 'not-triggered' }, ({ why }) => ({
        variant: 'neutral',
        label: 'No run',
        text: why,
      }))
      .exhaustive();
  }

  function choose(value: string): void {
    const chosen = REPO_EVENTS.find((candidate) => candidate.value === value);
    if (chosen !== undefined) event = chosen.value;
  }
</script>

<DocsDemo label="Which jobs run">
  {#snippet caption()}
    Each result applies the <code>on:</code> triggers of <code>ci.yml</code> and
    <code>release.yml</code>, the <code>if:</code> on the deploy job, and GitHub's rule for events
    made with <code>GITHUB_TOKEN</code>. The demo sends no request to GitHub.
  {/snippet}
  <div class="stack-md">
    <Field label="What happens">
      {#snippet children(control)}
        <Select
          {...control}
          value={event}
          onchange={(change) => choose(change.currentTarget.value)}
        >
          {#each REPO_EVENTS as option (option.value)}
            <option value={option.value}>{option.label}</option>
          {/each}
        </Select>
      {/snippet}
    </Field>
    <p class="row wrap gap-2 m-0 text-sm">
      <span>event <code>{facts.eventName}</code></span>
      <span>ref <code>{facts.ref}</code></span>
      <span>{facts.byWorkflowToken ? 'made with GITHUB_TOKEN' : 'made by a person'}</span>
    </p>
    <ol class="stack-sm m-0" aria-live="polite">
      {#each runs as run (run.job)}
        <li class="surface bordered rounded-container p-3 stack-sm">
          <p class="row wrap items-center justify-between gap-2 m-0">
            <strong>{run.job}</strong>
            <Badge variant={run.look.variant}>{run.look.label}</Badge>
          </p>
          <p class="m-0 text-xs text-muted"><code>{JOB_CONDITIONS[run.job]}</code></p>
          <p class="m-0 text-sm">{run.look.text}</p>
        </li>
      {/each}
    </ol>
  </div>
</DocsDemo>
