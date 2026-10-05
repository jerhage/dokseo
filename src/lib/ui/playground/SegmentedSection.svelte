<script lang="ts">
  import Card from '../components/Card.svelte';
  import SegmentedControl from '../components/SegmentedControl.svelte';
  import type { SegmentedVariant } from '../components/segmented-control';
  import DemoSection from './DemoSection.svelte';

  const VARIANTS: readonly SegmentedVariant[] = ['default', 'ghost', 'outline', 'track'];

  const VIEWS = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year', disabled: true },
  ];

  let view = $state('week');
  let scope = $state<string | undefined>(undefined);
</script>

<DemoSection
  id="segmented"
  title="Segmented control"
  classes={['segmented', 'segmented-track', 'segmented-item']}
>
  <div class="grid-2">
    {#each VARIANTS as variant (variant)}
      <Card>
        <div class="col gap-2">
          <p class="text-sm text-muted">{variant}</p>
          <SegmentedControl
            {variant}
            label="Calendar view, {variant}"
            options={VIEWS}
            bind:value={view}
          />
        </div>
      </Card>
    {/each}
    <Card>
      <div class="col gap-2">
        <p class="text-sm text-muted">Nothing chosen yet</p>
        <SegmentedControl
          label="Search in"
          variant="track"
          options={[
            { value: 'here', label: 'This page' },
            { value: 'all', label: 'Everywhere' },
          ]}
          bind:value={scope}
        />
      </div>
    </Card>
  </div>
</DemoSection>
