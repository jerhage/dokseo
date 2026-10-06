<script lang="ts">
  import Button from '../components/Button.svelte';
  import Card from '../components/Card.svelte';
  import ContextMenu from '../components/ContextMenu.svelte';
  import DropdownItem from '../components/DropdownItem.svelte';
  import DropdownSeparator from '../components/DropdownSeparator.svelte';
  import DemoSection from './DemoSection.svelte';

  let chosen = $state('nothing yet');
</script>

<DemoSection id="context-menu" title="Context menu" classes={['context-menu', 'dropdown-menu']}>
  <Card>
    <p class="text-sm text-muted">
      A menu over an area. A secondary click opens it at the pointer; Shift+F10 or the ContextMenu
      key opens it at the focused element. Escape or a click outside closes it.
    </p>
    <ContextMenu label="Card actions">
      <Button block>Right-click here, or focus this button and press Shift+F10</Button>
      {#snippet menu()}
        <DropdownItem onclick={() => (chosen = 'Open')}>Open</DropdownItem>
        <DropdownItem hint="F2" onclick={() => (chosen = 'Rename')}>Rename</DropdownItem>
        <DropdownItem disabled>Move to…</DropdownItem>
        <DropdownSeparator />
        <DropdownItem danger onclick={() => (chosen = 'Delete')}>Delete</DropdownItem>
      {/snippet}
    </ContextMenu>
    <p class="text-xs text-muted">Chosen: {chosen}</p>
  </Card>
</DemoSection>
