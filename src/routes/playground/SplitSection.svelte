<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import DemoSection from './DemoSection.svelte';

  const THREADS = [
    'Q3 roadmap review',
    'Design tokens v2',
    'Onboarding flow',
    'Pricing experiment',
  ];

  let thread = $state('Q3 roadmap review');
</script>

<DemoSection
  id="l-split"
  title="Split and split view"
  classes={['layout-split', 'split-pane', 'split-left', 'split-right', 'layout-split-view']}
>
  <Card>
    <div class="layout-split">
      <div class="split-pane split-right">
        <span class="card-eyebrow">.split-right, first in the DOM</span>
        <h3>Content reads first on mobile</h3>
        <p class="text-sm text-muted">
          Placement classes let the visual order differ from the source order; below 40rem the panes
          stack in DOM order.
        </p>
      </div>
      <div class="split-pane split-left">
        <Skeleton shape="block" />
      </div>
    </div>
  </Card>
  <div class="layout-split-view">
    <div class="split-pane">
      <span class="dropdown-label">Inbox</span>
      {#each THREADS as name (name)}
        <a
          class="nav-link"
          href="#l-split"
          aria-current={thread === name ? 'page' : undefined}
          onclick={() => (thread = name)}>{name}</a
        >
      {/each}
    </div>
    <div class="split-pane">
      <div class="row items-center justify-between wrap">
        <h3>{thread}</h3>
        <Badge variant="info">Thread</Badge>
      </div>
      <p class="text-sm text-muted">
        List and detail scroll on their own. Below 40rem of container width the detail drops beneath
        the list.
      </p>
      <div class="row gap-2">
        <Button size="sm">Reply</Button>
        <Button size="sm" variant="ghost">Archive</Button>
      </div>
    </div>
  </div>
</DemoSection>
