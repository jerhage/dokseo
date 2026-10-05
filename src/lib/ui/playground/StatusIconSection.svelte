<script lang="ts">
  import StatusIcon from '../components/StatusIcon.svelte';
  import type { StatusVariant } from '../components/classes';
  import DemoSection from './DemoSection.svelte';

  type Status = { readonly variant: StatusVariant; readonly tone: string };

  const STATUSES: readonly Status[] = [
    { variant: 'info', tone: 'text-info' },
    { variant: 'success', tone: 'text-success' },
    { variant: 'warning', tone: 'text-warning' },
    { variant: 'danger', tone: 'text-danger' },
  ];
</script>

<DemoSection id="status-icon" title="Status icon" classes={[]}>
  <p class="text-sm text-muted">
    The glyph for a status variant, as an alert and a toast draw it. It takes its colour and size
    from the class it is given.
  </p>
  <div class="row wrap items-center gap-5">
    {#each STATUSES as status (status.variant)}
      <span class={['row items-center gap-2', status.tone]}>
        <StatusIcon variant={status.variant} />
        <code class="text-xs">{status.variant}</code>
      </span>
    {/each}
  </div>
</DemoSection>
