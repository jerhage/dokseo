<script lang="ts">
  import Button from '../components/Button.svelte';
  import CommandItem from '../components/CommandItem.svelte';
  import ListGroup from '../components/ListGroup.svelte';
  import ListRow from '../components/ListRow.svelte';
  import Progress from '../components/Progress.svelte';
  import DemoSection from './DemoSection.svelte';
</script>

<DemoSection
  id="list-group"
  title="List group"
  classes={[
    'list-group',
    'list-group-title',
    'list-group-separated',
    'list-group-inset',
    'list-group-summary',
    'list-row',
    'list-row-sm',
    'list-row-strong',
    'list-row-value',
    'list-row-value-faint',
  ]}
>
  <div class="grid-2">
    <div class="col gap-6">
      <ListGroup title="Rows with a value, and a summary">
        <ListRow title="Photos" description="originals and their previews" value="1.2 GB">
          <Progress label="Photos, share of the space used" value={60} size="sm" />
        </ListRow>
        <ListRow
          title="Settings"
          description="the browser reports no size for these"
          value="not measurable"
          valueTone="faint"
        />
        {#snippet summary()}
          <ListRow listed size="sm" strong title="Measured" value="1.2 GB" />
          <ListRow listed size="sm" strong title="Reported" value="1.3 GB" />
        {/snippet}
      </ListGroup>
      <ListGroup title="Rows with actions">
        <ListRow title="Downloads" description="Files are removed from the downloads page.">
          {#snippet actions()}
            <Button href="#list-group" size="sm" variant="outline">Open downloads</Button>
          {/snippet}
        </ListRow>
        <ListRow title="Cache" description="Cleared here, and filled again as you browse.">
          {#snippet actions()}
            <Button size="sm" variant="ghost-danger">Clear</Button>
          {/snippet}
        </ListRow>
      </ListGroup>
    </div>
    <div class="col gap-2">
      <p class="text-sm text-muted">variant="inset", with interactive items</p>
      <ListGroup variant="inset">
        {#each ['First result', 'Second result', 'Third result'] as item (item)}
          <li>
            <CommandItem href="#list-group">{item}</CommandItem>
          </li>
        {/each}
      </ListGroup>
    </div>
  </div>
</DemoSection>
