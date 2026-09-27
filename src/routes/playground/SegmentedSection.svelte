<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import SegmentedControl from '$lib/components/SegmentedControl.svelte';
  import type { SegmentedVariant } from '$lib/components/segmented-control';
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

<DemoSection id="segmented" title="Segmented control" classes={['segmented', 'segmented-track']}>
  <div class="grid-2">
    {#each VARIANTS as variant (variant)}
      <Card>
        <div class="col gap-2">
          <p class="text-sm text-muted">{variant}</p>
          <SegmentedControl
            {variant}
            label="Calendar view, {variant}"
            options={VIEWS}
            value={view}
            onchoose={(chosen) => (view = chosen)}
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
          value={scope}
          onchoose={(chosen) => (scope = chosen)}
        />
      </div>
    </Card>
  </div>
</DemoSection>
