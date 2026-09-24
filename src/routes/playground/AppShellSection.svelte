<script lang="ts">
  import Avatar from '$lib/components/Avatar.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import DemoSection from './DemoSection.svelte';

  const LINKS = ['Overview', 'Projects', 'Reports', 'Team', 'Settings'];

  const STATS = [
    { label: 'Revenue', value: '$48.2k', delta: '+12.4%', up: true },
    { label: 'Active users', value: '3,914', delta: '+3.1%', up: true },
    { label: 'Churn', value: '1.8%', delta: '+0.4 pt', up: false },
  ];

  let current = $state('Overview');
</script>

<DemoSection
  id="l-shell"
  title="App shell"
  classes={['layout-app-shell', 'layout-main-area', 'layout-stats-grid', 'stat', 'nav-link']}
>
  <div class="layout-app-shell">
    <header class="layout-app-shell-header">
      <strong class="display">Acme</strong>
      <div class="row items-center gap-2">
        <Badge variant="accent">Pro</Badge>
        <Avatar size="sm">AL</Avatar>
      </div>
    </header>
    <nav class="layout-app-shell-nav" aria-label="App">
      {#each LINKS as link (link)}
        <a
          class="nav-link"
          href="#l-shell"
          aria-current={current === link ? 'page' : undefined}
          onclick={() => (current = link)}>{link}</a
        >
      {/each}
    </nav>
    <main class="layout-main-area">
      <div class="row items-center justify-between wrap">
        <h3>{current}</h3>
        <Button variant="primary" size="sm">New project</Button>
      </div>
      <div class="layout-stats-grid">
        {#each STATS as stat (stat.label)}
          <div class="stat">
            <span class="stat-label">{stat.label}</span>
            <span class="stat-value">{stat.value}</span>
            <span class={['stat-delta', stat.up ? 'stat-delta-up' : 'stat-delta-down']}>
              {stat.delta}
            </span>
          </div>
        {/each}
      </div>
      <Card heading="h4">
        {#snippet title()}Recent activity{/snippet}
        {#snippet description()}
          The main area is its own container: its contents respond to the space left beside the nav,
          not to the viewport.
        {/snippet}
      </Card>
    </main>
  </div>
</DemoSection>
