<script lang="ts">
  import Card from '../components/Card.svelte';
  import Stepper from '../components/Stepper.svelte';
  import type { Step } from '../components/stepper';
  import Toggle from '../components/Toggle.svelte';
  import DemoSection from './DemoSection.svelte';

  const WORDS = ['kraken', 'lantern', 'harbour', 'compass', 'anchor'];

  let linked = $state(0);
  let found = $state(0);
  let looking = $state(true);

  const linkedSteps = $derived({
    previous: linked > 0 ? `#stepper-${linked - 1}` : null,
    next: linked + 1 < WORDS.length ? `#stepper-${linked + 1}` : null,
    count: `${linked + 1} of ${WORDS.length}`,
  });

  const foundSteps = $derived(
    looking
      ? {
          previous: found > 0 ? stepTo(found - 1) : null,
          next: found + 1 < WORDS.length ? stepTo(found + 1) : null,
          count: `match ${found + 1} of ${WORDS.length}`,
        }
      : null,
  );

  function stepTo(at: number): Step {
    return () => (found = at);
  }

  function follow(event: MouseEvent, href: string): void {
    event.preventDefault();
    linked = Number(href.slice('#stepper-'.length));
  }
</script>

<DemoSection id="stepper" title="Stepper" classes={['stepper']}>
  <p class="text-sm text-muted">
    Previous and next through a list, with the place in it. A step is an address (a link), a
    function (a button) or nothing; nothing is a disabled button, or no button at all.
  </p>
  <div class="grid-2">
    <Card>
      <div class="col gap-2">
        <code class="text-xs">countAs="badge" missingStep="hidden", links</code>
        <Stepper
          steps={linkedSteps}
          missingStep="hidden"
          previousLabel="Previous word"
          nextLabel="Next word"
          onfollow={follow}
          class="gap-2 ps-3 pe-1 py-1 surface-raised bordered rounded-container"
          role="group"
          aria-label="Words"
        >
          <span class="flex-fill min-w-0 truncate text-sm">{WORDS[linked]}</span>
        </Stepper>
      </div>
    </Card>
    <Card>
      <div class="col gap-2">
        <code class="text-xs">axis="block" countAs="status" spaced, buttons</code>
        <Toggle bind:checked={looking}>Stepping</Toggle>
        <Stepper
          steps={foundSteps}
          axis="block"
          countAs="status"
          spaced
          previousLabel="Previous match"
          nextLabel="Next match"
          class="gap-1"
        >
          <span class="flex-fill min-w-0 truncate text-sm">{looking ? WORDS[found] : '—'}</span>
        </Stepper>
      </div>
    </Card>
  </div>
</DemoSection>
