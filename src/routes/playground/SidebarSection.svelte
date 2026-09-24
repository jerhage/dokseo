<script lang="ts">
  import Field from '$lib/components/Field.svelte';
  import Input from '$lib/components/Input.svelte';
  import NavLink from '$lib/components/NavLink.svelte';
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
  <div class="surface bordered rounded-container p-5">
    <div class="layout-sidebar">
      <nav class="layout-sidebar-aside" aria-label="Settings">
        {#each LINKS as link (link)}
          <NavLink href="#l-sidebar" current={current === link} onclick={() => (current = link)}
            >{link}</NavLink
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
  </div>
  <div class="surface bordered rounded-container p-5">
    <div class="layout-sidebar layout-sidebar-end">
      <Tile label="content first" />
      <Tile variant="feature" label=".layout-sidebar-end aside" />
    </div>
  </div>
  <div class="grid-sidebar">
    <Tile variant="feature" label=".grid-sidebar > :first-child" />
    <Tile label=":last-child wraps intrinsically, no query" />
  </div>
</DemoSection>
