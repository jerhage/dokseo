<script lang="ts">
  import Alert from '$lib/ui/components/Alert.svelte';
  import Badge from '$lib/ui/components/Badge.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Fieldset from '$lib/ui/components/Fieldset.svelte';
  import Input from '$lib/ui/components/Input.svelte';
  import ListGroup from '$lib/ui/components/ListGroup.svelte';
  import ListRow from '$lib/ui/components/ListRow.svelte';
  import Radio from '$lib/ui/components/Radio.svelte';
  import Toggle from '$lib/ui/components/Toggle.svelte';
  import {
    STRATEGY_OPTIONS,
    importStatus,
    nothingToWrite,
    previewRows,
  } from '$lib/domains/storage/ui/captures-import-text';
  import ConflictReview from '$lib/domains/storage/ui/ConflictReview.svelte';
  import { bookTitle, isRemoved } from './sample-holdings';
  import type { SimulatedDevice } from './simulated-device.svelte';
  import { TwoDevicesView } from './two-devices.svelte';

  const view = new TwoDevicesView();
  const uid = $props.id();
  const times = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });

  const importing = $derived(view.importing);
  const phase = $derived(importing?.state ?? null);
  const status = $derived(phase === null ? null : importStatus(phase));
  const planned = $derived(
    phase !== null && (phase.kind === 'preview' || phase.kind === 'reviewing') ? phase : null,
  );
  const editing = $derived(phase?.kind === 'reviewing' && phase.draft !== null);
  const deviceNames = { phone: 'Phone', laptop: 'Laptop' } as const;
</script>

{#snippet device(held: SimulatedDevice)}
  {@const holdings = held.holdings}
  <section class="col gap-3 bordered rounded-container p-3" aria-label={deviceNames[held.name]}>
    <div class="row wrap items-center justify-between gap-2">
      <h3 class="m-0 text-base">{deviceNames[held.name]}</h3>
      <Badge>{held.writes} writes</Badge>
    </div>
    <ul class="list-reset col gap-3">
      {#each holdings.captures as capture (capture.id)}
        <li class="col gap-1">
          <span class="text-xs text-muted">
            {bookTitle(holdings, capture.bookId)}{isRemoved(holdings, capture.bookId)
              ? ', in Removed books'
              : ''} · {capture.editedAt === null
              ? `captured ${times.format(capture.createdAt)}`
              : `edited ${times.format(capture.editedAt)}`}
          </span>
          <Input
            value={capture.text}
            lang="ja"
            aria-label="Capture text on the {held.name}"
            onchange={(event) => view.edit(held.name, capture.id, event.currentTarget.value)}
          />
          <span class="row wrap gap-1">
            {#each holdings.tags.filter((tag) => capture.tagIds.includes(tag.id)) as tag (tag.id)}
              <Badge color={tag.colour}>{tag.name}</Badge>
            {/each}
          </span>
        </li>
      {/each}
    </ul>
    <Button size="sm" variant="outline" onclick={() => void view.send(held.name)}>
      Export, then import on the {held.name === 'phone' ? 'laptop' : 'phone'}
    </Button>
  </section>
{/snippet}

<div class="stack-md">
  <div class="grid-2 gap-3">
    {@render device(view.phone)}
    {@render device(view.laptop)}
  </div>
  <Toggle checked={view.frozen} onchange={(event) => view.freeze(event.currentTarget.checked)}>
    Stop the clock, so the next edits share one time
  </Toggle>

  {#if importing !== null && view.transfer !== null && phase !== null}
    {@const transfer = view.transfer}
    <section class="col gap-3" aria-label="The import">
      <p class="m-0 text-sm">
        <code>{transfer.name}</code> from the {transfer.from}, importing on the {transfer.to}.
      </p>

      {#if phase.kind === 'idle'}
        <Alert variant="info" title="Import canceled. Nothing was written." />
      {/if}

      {#if status !== null}
        <Alert variant={status.variant} title={status.message}>
          {#if status.notes.length > 0}
            <ul class="col gap-1">
              {#each status.notes as note (note)}
                <li>{note}</li>
              {/each}
            </ul>
          {/if}
          <p class="m-0">This import wrote {view.writesThisImport} records.</p>
          {#snippet actions()}
            <Button size="sm" variant="outline" onclick={() => void view.importAgain()}>
              Import the same file again
            </Button>
          {/snippet}
        </Alert>
      {/if}

      {#if planned !== null}
        {@const summary = planned.plan.summary}
        <ListGroup title="In this file">
          {#each previewRows(summary) as row (row.title)}
            <ListRow title={row.title} description={row.description} value={row.value} />
          {/each}
        </ListGroup>

        {#if nothingToWrite(summary)}
          <Alert variant="info" title="Everything in this file is already here.">
            Dokseo offers only Close here. The demo also lets you apply the plan, to count its
            writes.
            {#snippet actions()}
              <Button size="sm" variant="ghost" onclick={() => importing.cancel()}>Close</Button>
              <Button size="sm" variant="outline" onclick={() => void importing.importNow()}>
                Apply anyway
              </Button>
            {/snippet}
          </Alert>
        {:else}
          {#if summary.conflicts > 0}
            <Fieldset legend="When a capture differs">
              <div class="col gap-3">
                {#each STRATEGY_OPTIONS as option (option.strategy)}
                  <Radio
                    name="{uid}-strategy"
                    value={option.strategy}
                    group={importing.strategy}
                    hint={option.hint}
                    onchange={() => importing.pickStrategy(option.strategy)}
                  >
                    {option.label}
                  </Radio>
                {/each}
              </div>
            </Fieldset>
          {/if}

          {#if planned.kind === 'reviewing'}
            <ConflictReview view={importing} review={planned} />
          {/if}

          <div class="row wrap justify-end gap-2">
            <Button size="sm" variant="ghost" onclick={() => importing.cancel()}>Cancel</Button>
            <Button
              size="sm"
              variant="primary"
              disabled={editing}
              onclick={() => void importing.importNow()}
            >
              Import
            </Button>
          </div>
        {/if}
      {/if}
    </section>
  {/if}
</div>
