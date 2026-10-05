<script lang="ts">
  import Button from '../components/Button.svelte';
  import Card from '../components/Card.svelte';
  import EmptyState from '../components/EmptyState.svelte';
  import DemoSection from './DemoSection.svelte';
</script>

<DemoSection
  id="empty-state"
  title="Empty state"
  classes={['empty-state', 'empty-state-fill', 'empty-state-inline', 'empty-state-message']}
>
  <div class="grid-2">
    <Card>
      <div class="col gap-2">
        <p class="text-sm text-muted">inline</p>
        <EmptyState message="No uploads yet. Drop a book here to start." />
      </div>
    </Card>
    <Card>
      <div class="col gap-2">
        <p class="text-sm text-muted">inline, with an action</p>
        <EmptyState message="Nothing carries this tag any more.">
          {#snippet action()}
            <Button size="sm">Choose another tag</Button>
          {/snippet}
        </EmptyState>
      </div>
    </Card>
    <Card>
      <div class="col aspect-video overflow-hidden rounded-container">
        <EmptyState
          variant="fill"
          live
          message="Opening the book…"
          class="flex-1 min-h-0 scheme-dark surface-sunken"
        />
      </div>
    </Card>
    <Card>
      <div class="col aspect-video overflow-hidden rounded-container">
        <EmptyState
          variant="fill"
          live
          message="This book could not be opened. The file may be damaged, or in a format this reader does not know."
          class="flex-1 min-h-0 surface-bg text-center"
        >
          {#snippet action()}
            <Button href="#empty-state" variant="primary" size="sm">Back to your library</Button>
          {/snippet}
        </EmptyState>
      </div>
    </Card>
  </div>
</DemoSection>
