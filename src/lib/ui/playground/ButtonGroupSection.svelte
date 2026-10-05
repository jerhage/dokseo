<script lang="ts">
  import Button from '../components/Button.svelte';
  import ButtonGroup from '../components/ButtonGroup.svelte';
  import Card from '../components/Card.svelte';
  import IconButton from '../components/IconButton.svelte';
  import ChevronLeft from '../components/icons/ChevronLeft.svelte';
  import ChevronRight from '../components/icons/ChevronRight.svelte';
  import Copy from '../components/icons/Copy.svelte';
  import Pencil from '../components/icons/Pencil.svelte';
  import Trash from '../components/icons/Trash.svelte';
  import DemoSection from './DemoSection.svelte';

  let page = $state(1);
</script>

<DemoSection id="button-group" title="Button group" classes={['btn-group']}>
  <p class="text-sm text-muted">
    Related actions joined into one row, named as a group. A single choice among options is a
    segmented control, not a button group.
  </p>
  <div class="grid-2">
    <Card>
      <span class="eyebrow text-faint weight-semibold">Buttons</span>
      <div class="row wrap items-center gap-3">
        <ButtonGroup label="History">
          <Button size="sm">Undo</Button>
          <Button size="sm">Redo</Button>
          <Button size="sm">Clear</Button>
        </ButtonGroup>
        <ButtonGroup label="Export">
          <Button size="sm" variant="outline">CSV</Button>
          <Button size="sm" variant="outline">PDF</Button>
          <Button size="sm" variant="outline" disabled>Print</Button>
        </ButtonGroup>
        <ButtonGroup label="Save">
          <Button variant="primary">Save</Button>
          <Button variant="primary">Save and close</Button>
        </ButtonGroup>
      </div>
    </Card>
    <Card>
      <span class="eyebrow text-faint weight-semibold">Icon buttons</span>
      <div class="row wrap items-center gap-3">
        <ButtonGroup label="Edit the item">
          <IconButton size="sm" icon={Pencil} label="Rename" />
          <IconButton size="sm" icon={Copy} label="Duplicate" />
          <IconButton size="sm" icon={Trash} label="Delete" variant="danger" />
        </ButtonGroup>
        <span class="text-sm text-muted" id="button-group-page">Page {page}</span>
        <ButtonGroup aria-labelledby="button-group-page">
          <IconButton
            size="sm"
            icon={ChevronLeft}
            label="Previous page"
            disabled={page === 1}
            onclick={() => (page -= 1)}
          />
          <IconButton size="sm" icon={ChevronRight} label="Next page" onclick={() => (page += 1)} />
        </ButtonGroup>
      </div>
    </Card>
  </div>
</DemoSection>
