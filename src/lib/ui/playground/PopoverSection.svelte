<script lang="ts">
  import Badge from '../components/Badge.svelte';
  import Button from '../components/Button.svelte';
  import IconButton from '../components/IconButton.svelte';
  import Card from '../components/Card.svelte';
  import Popover from '../components/Popover.svelte';
  import DemoSection from './DemoSection.svelte';
</script>

<DemoSection id="popover" title="Popover" classes={['popover', 'btn-wrap']}>
  <Card>
    <p class="text-sm text-muted">
      A non-modal dialog anchored to its trigger. Escape, a click outside or the trigger closes it,
      and focus returns to the trigger when it was inside.
    </p>
    <div class="row wrap items-center gap-3">
      <Popover label="About this plan">
        {#snippet trigger(popover)}
          <IconButton
            variant="outline"
            size="sm"
            pill
            label="About this plan"
            tooltip={false}
            {...popover}
          >
            <span aria-hidden="true">i</span>
          </IconButton>
        {/snippet}
        <div class="col gap-3">
          <p class="eyebrow mono text-faint">Team plan</p>
          <p class="text-sm">Five seats, shared folders and a weekly export.</p>
          <p class="text-xs text-muted border-t pt-2">Billed yearly.</p>
        </div>
      </Popover>
      <Popover label="Status" class="p-2">
        {#snippet trigger(popover)}
          <Button size="sm" pill {...popover}>
            Status
            <Badge dot variant="success">Online</Badge>
          </Button>
        {/snippet}
        <p class="text-sm p-2">Every service is running.</p>
        <p class="text-sm p-2"><a href="#popover">Status history…</a></p>
      </Popover>
    </div>
  </Card>
  <Card>
    <p class="text-sm text-muted">
      Near the end of the screen the popover lines up with the end of its trigger, or shifts back
      inside the screen when neither side fits; with no room below it opens above.
    </p>
    <div class="row justify-between gap-3">
      <span></span>
      <Popover label="Near the edge">
        {#snippet trigger(popover)}
          <Button size="sm" {...popover}>End</Button>
        {/snippet}
        <p class="text-sm">This popover keeps a gap to the edge of the screen.</p>
      </Popover>
    </div>
  </Card>
  <Card>
    <span class="eyebrow text-faint weight-semibold">Wrapping button</span>
    <div class="grid-auto grid-auto-sm">
      <Button size="sm" pill wrap>
        A long label that breaks over lines
        <Badge dot variant="warning">Waiting</Badge>
      </Button>
    </div>
  </Card>
</DemoSection>
