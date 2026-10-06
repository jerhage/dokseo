<script lang="ts">
  import Button from '../components/Button.svelte';
  import Card from '../components/Card.svelte';
  import Drawer from '../components/Drawer.svelte';
  import type { DrawerSide } from '../components/classes';
  import DemoSection from './DemoSection.svelte';

  const SIDES: readonly DrawerSide[] = ['end', 'start', 'bottom'];

  let side = $state<DrawerSide>('end');
  let open = $state(false);
  let closedBy = $state('nothing yet');

  function openFrom(chosen: DrawerSide): void {
    side = chosen;
    open = true;
  }
</script>

<DemoSection
  id="drawer"
  title="Drawer"
  classes={['drawer-backdrop', 'drawer', 'drawer-start', 'drawer-bottom', 'drawer-footer']}
>
  <Card>
    <p class="text-sm text-muted">
      A modal dialog that slides in from an edge. Escape, the close button or a click on the
      backdrop slides it back out; focus returns to the button that opened it.
    </p>
    <div class="row wrap items-center gap-3">
      {#each SIDES as each (each)}
        <Button size="sm" onclick={() => openFrom(each)}>From the {each}</Button>
      {/each}
    </div>
    <p class="text-xs text-muted">Last closed: {closedBy}</p>
  </Card>
  <Drawer title="Filters" {side} bind:open onclose={() => (closedBy = `the ${side} drawer`)}>
    <p>Narrow the list by format, language and reading state.</p>
    <p>The body scrolls on its own when the drawer holds more than fits.</p>
    {#snippet footer(close)}
      <Button onclick={close}>Cancel</Button>
      <Button variant="primary" onclick={close}>Apply</Button>
    {/snippet}
  </Drawer>
</DemoSection>
