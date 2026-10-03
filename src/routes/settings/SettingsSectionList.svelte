<script lang="ts">
  import Avatar from '$lib/components/Avatar.svelte';
  import ChevronRight from '$lib/components/icons/ChevronRight.svelte';
  import ListGroup from '$lib/components/ListGroup.svelte';
  import NavLink from '$lib/components/NavLink.svelte';
  import { settingsSections } from './settings-sections';
  import SettingsShell from './SettingsShell.svelte';

  type Props = {
    readonly root?: string;
  };

  let { root = '/settings' }: Props = $props();

  const sections = $derived(settingsSections(root));
</script>

<SettingsShell current={null} {root}>
  <nav class="col gap-4 prose" aria-label="Settings sections">
    <h1 class="text-lg">Settings</h1>
    <ListGroup variant="inset">
      {#each sections as section (section.id)}
        <li>
          <NavLink href={section.pageHref} strong class="py-2">
            {#snippet icon()}
              <Avatar shape="square" size="sm"><section.icon class="avatar-icon" /></Avatar>
            {/snippet}
            <span class="col gap-0 min-w-0">
              <span>{section.name}</span>
              <span class="text-xs text-faint weight-normal">{section.summary}</span>
            </span>
            <ChevronRight class="ms-auto text-faint" aria-hidden="true" />
          </NavLink>
        </li>
      {/each}
    </ListGroup>
  </nav>
</SettingsShell>
