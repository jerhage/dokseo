<script lang="ts">
  import { match } from 'ts-pattern';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import { announcementRole } from '$lib/components/announcement';
  import type { AnnouncementRole } from '$lib/components/announcement';
  import type { StatusVariant } from '$lib/components/classes';
  import SegmentedControl from '$lib/components/SegmentedControl.svelte';
  import { getToaster } from '$lib/components/toast-context';
  import DocsDemo from '../../DocsDemo.svelte';

  type Announced = {
    readonly id: number;
    readonly where: string;
    readonly role: AnnouncementRole;
    readonly text: string;
  };

  const VARIANT_OPTIONS = [
    { value: 'info', label: 'info' },
    { value: 'success', label: 'success' },
    { value: 'warning', label: 'warning' },
    { value: 'danger', label: 'danger' },
  ] as const;

  const KEPT_ENTRIES = 8;

  const toaster = getToaster();

  let statusText = $state('');
  let alertText = $state('');
  let variant = $state<StatusVariant>('info');
  let entries = $state<readonly Announced[]>([]);
  let next = 1;

  function politeness(role: AnnouncementRole): string {
    return match(role)
      .with('status', () => 'polite')
      .with('alert', () => 'assertive')
      .exhaustive();
  }

  function record(where: string, role: AnnouncementRole, text: string): void {
    entries = [{ id: next, where, role, text }, ...entries].slice(0, KEPT_ENTRIES);
    next += 1;
  }

  function writeStatus(): void {
    statusText = `Page ${next + 11} of 60`;
    record('status region', 'status', statusText);
  }

  function writeAlert(): void {
    alertText = `The capture could not be read (${next}).`;
    record('alert region', 'alert', alertText);
  }

  function showToast(): void {
    const title = `A ${variant} toast (${next})`;
    toaster.show({ title, variant });
    record('Dokseo toast', announcementRole(variant), title);
  }
</script>

<DocsDemo label="Live regions">
  {#snippet caption()}
    The log lists what was written into a live region and the politeness its role implies. What a
    screen reader then says, and when, is up to the screen reader; turn one on to hear it.
  {/snippet}
  <div class="stack-md">
    <div class="grid-2 gap-3">
      <div class="stack-sm">
        <Button size="sm" variant="outline" onclick={writeStatus}>Write to the status region</Button
        >
        <div class="bordered rounded-container p-3 text-sm" role="status">{statusText}</div>
      </div>
      <div class="stack-sm">
        <Button size="sm" variant="outline" onclick={writeAlert}>Write to the alert region</Button>
        <div class="bordered rounded-container p-3 text-sm" role="alert">{alertText}</div>
      </div>
    </div>
    <div class="row wrap items-center gap-3">
      <SegmentedControl label="Toast variant" options={VARIANT_OPTIONS} bind:value={variant} />
      <Button size="sm" variant="primary" onclick={showToast}>Show a real toast</Button>
    </div>
    {#if entries.length > 0}
      <ol class="stack-sm m-0 text-sm" aria-label="Announcement log">
        {#each entries as entry (entry.id)}
          <li class="row wrap items-center gap-2">
            <Badge variant={entry.role === 'alert' ? 'danger' : 'info'}>
              role {entry.role}, {politeness(entry.role)}
            </Badge>
            <span class="text-muted">{entry.where}:</span>
            <span>{entry.text}</span>
          </li>
        {/each}
      </ol>
    {/if}
  </div>
</DocsDemo>
