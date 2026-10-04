<script lang="ts">
  import { match } from 'ts-pattern';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import SegmentedControl from '$lib/components/SegmentedControl.svelte';
  import { SaveDesk } from '../../../domain/double-submit';
  import type { PressOutcome, SubmitHandling } from '../../../domain/double-submit';
  import DocsDemo from '../../DocsDemo.svelte';

  const HANDLINGS: readonly { readonly value: SubmitHandling; readonly label: string }[] = [
    { value: 'naive', label: 'Naive' },
    { value: 'disable', label: 'Disable' },
    { value: 'ignore', label: 'Ignore' },
  ];

  const SAVE_MS = 1500;

  let handling = $state<SubmitHandling>('naive');
  let log = $state.raw<readonly string[]>([]);
  let written = $state(0);
  let disabled = $state(false);
  let button = $state<HTMLButtonElement | null>(null);

  function note(line: string): void {
    log = [...log, line];
  }

  function pressedText(outcome: PressOutcome): string {
    return match(outcome)
      .with({ kind: 'started' }, ({ save }) => `Save ${save} started`)
      .with({ kind: 'ignored' }, () => 'A press arrived during a save and was ignored')
      .exhaustive();
  }

  function deskFor(chosen: SubmitHandling): SaveDesk {
    const built: SaveDesk = new SaveDesk(
      chosen,
      () => new Promise((resolve) => setTimeout(resolve, SAVE_MS)),
      {
        changed: () => {
          disabled = built.disabled;
          written = built.written;
        },
        pressed: (outcome) => note(pressedText(outcome)),
        saved: (save) => note(`Save ${save} wrote the record`),
      },
    );
    return built;
  }

  let desk = deskFor('naive');

  function chooseHandling(value: SubmitHandling): void {
    handling = value;
    desk = deskFor(value);
    log = [];
    written = 0;
    disabled = false;
  }

  function clickTwiceInOneTask(): void {
    button?.click();
    button?.click();
  }
</script>

<DocsDemo label="A slow save and a second press">
  {#snippet caption()}
    Each save waits 1.5 s on a real timer, then counts one record written. The second button calls
    <code>click()</code> on the Save button twice in the same task, so both clicks run before Svelte
    applies the <code>disabled</code> attribute in a microtask.
  {/snippet}
  <div class="stack-md">
    <SegmentedControl
      label="Handling"
      variant="track"
      options={HANDLINGS}
      bind:value={() => handling, chooseHandling}
    />
    <div class="row wrap gap-2">
      <Button
        size="sm"
        variant="primary"
        bind:ref={button}
        loading={disabled}
        {disabled}
        onclick={() => void desk.press()}
      >
        Save
      </Button>
      <Button size="sm" variant="outline" onclick={clickTwiceInOneTask}>
        Click Save twice in one task
      </Button>
    </div>
    <p class="m-0 row wrap items-center gap-2" aria-live="polite">
      <Badge variant={written > 1 ? 'danger' : 'neutral'}>{written} records written</Badge>
    </p>
    {#if log.length > 0}
      <ol class="stack-sm m-0 text-sm">
        {#each log as line, index (index)}
          <li>{line}</li>
        {/each}
      </ol>
    {/if}
  </div>
</DocsDemo>
