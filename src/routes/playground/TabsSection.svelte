<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import Tabs from '$lib/components/Tabs.svelte';
  import type { TabItem } from '$lib/components/tabs';
  import DemoSection from './DemoSection.svelte';

  const PROJECT: readonly TabItem[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'activity', label: 'Activity' },
    { id: 'settings', label: 'Settings' },
    { id: 'billing', label: 'Billing', disabled: true },
  ];

  const RANGE: readonly TabItem[] = [
    { id: 'day', label: 'Day' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
  ];

  const PANELS: Readonly<Record<string, string>> = {
    overview: 'Overview panel. Arrow keys move between tabs and skip the disabled one.',
    activity: 'Activity panel. 14 events this week.',
    settings: 'Settings panel. Name, members, danger zone.',
    day: '1,204 visits today.',
    week: '8,930 visits this week.',
    month: '36,112 visits this month.',
  };

  let project = $state('overview');
</script>

{#snippet panel(tab: TabItem)}
  <p>{PANELS[tab.id] ?? tab.label}</p>
{/snippet}

<DemoSection id="tabs" title="Tabs" classes={['tabs', 'tabs-pill', 'tab-list', 'tab', 'tab-panel']}>
  <div class="grid-3">
    <Card>
      <Tabs tabs={PROJECT} label="Project" bind:selected={project} {panel} />
      <p class="text-xs text-faint">Selected: {project}</p>
    </Card>
    <Card>
      <Tabs tabs={RANGE} label="Range" variant="pill" {panel} />
    </Card>
    <Card>
      <div dir="rtl" class="stack-sm">
        <span class="text-xs text-faint">dir="rtl": the arrow keys follow the text direction</span>
        <Tabs tabs={RANGE} label="Range, right to left" {panel} />
      </div>
    </Card>
  </div>
</DemoSection>
