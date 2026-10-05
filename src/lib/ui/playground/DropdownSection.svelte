<script lang="ts">
  import Card from '../components/Card.svelte';
  import Dropdown from '../components/Dropdown.svelte';
  import DropdownItem from '../components/DropdownItem.svelte';
  import DropdownLabel from '../components/DropdownLabel.svelte';
  import DropdownSeparator from '../components/DropdownSeparator.svelte';
  import Ellipsis from '../components/icons/Ellipsis.svelte';
  import DemoSection from './DemoSection.svelte';

  const SORTS = ['Newest', 'Oldest', 'Name A–Z'];

  let sort = $state('Newest');
  let chosen = $state('nothing yet');
</script>

<DemoSection
  id="dropdown"
  title="Dropdown"
  classes={[
    'dropdown',
    'dropdown-menu',
    'dropdown-item',
    'dropdown-separator',
    'is-open',
    'is-active',
  ]}
>
  <Card>
    <div class="row wrap items-start gap-3">
      <Dropdown>
        {#snippet trigger()}Actions{/snippet}
        <DropdownLabel>File</DropdownLabel>
        <DropdownItem hint="F2" onclick={() => (chosen = 'Rename')}>Rename</DropdownItem>
        <DropdownItem hint="⌘D" onclick={() => (chosen = 'Duplicate')}>Duplicate</DropdownItem>
        <DropdownItem disabled>Move to…</DropdownItem>
        <DropdownSeparator />
        <DropdownItem danger onclick={() => (chosen = 'Delete')}>Delete</DropdownItem>
      </Dropdown>
      <Dropdown variant="ghost">
        {#snippet trigger()}Sort: {sort}{/snippet}
        {#each SORTS as option (option)}
          <DropdownItem selected={sort === option} onclick={() => (sort = option)}
            >{option}</DropdownItem
          >
        {/each}
      </Dropdown>
      <Dropdown variant="primary" size="sm" align="end">
        {#snippet trigger()}Small, aligned to the end{/snippet}
        <DropdownItem onclick={() => (chosen = 'Export')}>Export</DropdownItem>
        <DropdownItem onclick={() => (chosen = 'Share')}>Share</DropdownItem>
      </Dropdown>
      <Dropdown variant="ghost" square chevron={false} icon={Ellipsis} label="More actions">
        <DropdownItem onclick={() => (chosen = 'Pin')}>Pin</DropdownItem>
        <DropdownItem onclick={() => (chosen = 'Archive')}>Archive</DropdownItem>
      </Dropdown>
    </div>
    <p class="text-sm text-muted">Last chosen: {chosen}</p>
  </Card>
  <Card>
    <p class="text-sm text-muted">
      A menu flips to the other side of its trigger rather than open past the edge of the screen.
    </p>
    <div class="row justify-between gap-3">
      <Dropdown size="sm" align="end">
        {#snippet trigger()}End{/snippet}
        <DropdownItem onclick={() => (chosen = 'Export')}>Export</DropdownItem>
        <DropdownItem onclick={() => (chosen = 'Share')}>Share</DropdownItem>
      </Dropdown>
      <Dropdown size="sm">
        {#snippet trigger()}Start{/snippet}
        <DropdownItem onclick={() => (chosen = 'Export')}>Export</DropdownItem>
        <DropdownItem onclick={() => (chosen = 'Share')}>Share</DropdownItem>
      </Dropdown>
    </div>
  </Card>
</DemoSection>
