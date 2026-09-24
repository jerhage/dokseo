<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import Field from '$lib/components/Field.svelte';
  import Input from '$lib/components/Input.svelte';
  import DemoSection from './DemoSection.svelte';
  import Tile from './Tile.svelte';

  const LINKS = ['General', 'Members', 'Billing', 'Integrations'];

  let current = $state('General');
</script>

<DemoSection
  id="l-sidebar"
  title="Sidebar"
  classes={['layout-sidebar', 'layout-sidebar-end', 'grid-sidebar']}
>
  <Card>
    <div class="layout-sidebar">
      <nav class="layout-sidebar-aside" aria-label="Settings">
        {#each LINKS as link (link)}
          <a
            class="nav-link"
            href="#l-sidebar"
            aria-current={current === link ? 'page' : undefined}
            onclick={() => (current = link)}>{link}</a
          >
        {/each}
      </nav>
      <div class="layout-sidebar-content">
        <div class="stack-sm">
          <h3>{current}</h3>
          <p class="text-sm text-muted">
            A sticky aside that moves above the content under 44rem of container width.
          </p>
        </div>
        <div class="grid-2">
          <Field label="Workspace name">
            {#snippet children(control)}
              <Input {...control} value="Northwind" />
            {/snippet}
          </Field>
          <Field label="URL">
            {#snippet children(control)}
              <Input {...control} value="northwind.app" />
            {/snippet}
          </Field>
        </div>
      </div>
    </div>
  </Card>
  <Card>
    <div class="layout-sidebar layout-sidebar-end">
      <Tile label="content first" />
      <Tile variant="feature" label=".layout-sidebar-end aside" />
    </div>
  </Card>
  <div class="grid-sidebar">
    <Tile variant="feature" label=".grid-sidebar > :first-child" />
    <Tile label=":last-child wraps intrinsically, no query" />
  </div>
</DemoSection>
