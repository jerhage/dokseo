<script lang="ts">
  import Card from '../components/Card.svelte';
  import Dock from '../components/Dock.svelte';
  import Toggle from '../components/Toggle.svelte';
  import { dockPlacement } from '../components/dock';
  import DemoSection from './DemoSection.svelte';

  const frames = $state([
    { narrow: false, asked: true },
    { narrow: false, asked: false },
    { narrow: true, asked: true },
    { narrow: true, asked: false },
  ]);

  let counted = $state(true);

  const count = $derived(counted ? 3 : undefined);
</script>

<DemoSection
  id="dock"
  title="Dock"
  classes={[
    'dock',
    'dock-side',
    'dock-rail',
    'dock-sheet',
    'dock-peek',
    'dock-panel',
    'dock-drawer',
    'dock-handle',
    'dock-handle-grip',
    'dock-probe',
  ]}
>
  <p class="text-sm text-muted">
    A panel beside the page on a wide screen, or below it on a narrow one. Its arrow toggle hides it
    to a rail or a peek, which shows a count while it is closed. The sheet's handle drags it taller
    or shorter, settling at its standard or tall height, and closes it when dragged below the
    standard one; Enter or Space switches the two heights, and the up and down arrows step between
    them.
  </p>
  <Toggle bind:checked={counted}>With a count</Toggle>
  <div class="grid-2">
    {#each frames as frame, index (index)}
      {@const placement = dockPlacement(frame.narrow, frame.asked)}
      <Card>
        <div class="col gap-2">
          <code class="text-xs">placement="{placement}"</code>
          <div
            class={[
              'gap-0 overflow-hidden surface-sunken rounded-container',
              frame.narrow ? 'col aspect-square' : 'row aspect-video',
            ]}
          >
            <div class="col items-center justify-center flex-1 min-h-0 p-4 text-sm text-muted">
              The page
            </div>
            <Dock
              {placement}
              {count}
              label="Notes"
              expandLabel="Show notes"
              collapseLabel="Hide notes"
              resizeLabel="Resize notes"
              ontoggle={() => (frame.asked = !frame.asked)}
            >
              <div class="col gap-2 flex-1 p-3 overflow-y-auto text-sm">
                <p>The panel's content.</p>
                <p class="text-muted">It fills the dock and scrolls on its own.</p>
              </div>
            </Dock>
          </div>
        </div>
      </Card>
    {/each}
  </div>
</DemoSection>
