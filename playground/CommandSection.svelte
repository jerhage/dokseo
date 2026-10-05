<script lang="ts">
  import Button from '../components/Button.svelte';
  import Card from '../components/Card.svelte';
  import CommandItem from '../components/CommandItem.svelte';
  import Modal from '../components/Modal.svelte';
  import SearchField from '../components/SearchField.svelte';
  import { isComposingKey } from './composing-key';
  import DemoSection from './DemoSection.svelte';

  type Command = { readonly name: string; readonly note: string; readonly hint: string };

  const COMMANDS: readonly Command[] = [
    { name: 'Open recent file', note: 'Jumps to the last place you read', hint: '⌘O' },
    { name: 'Rename workspace', note: 'Changes the name everyone sees', hint: 'F2' },
    { name: 'Export as archive', note: 'Packs every file into one download', hint: '⌘E' },
    { name: 'Remove member', note: 'Revokes access at once', hint: '⌘⌫' },
  ];

  let searching = $state(false);
  let query = $state('');
  let at = $state(0);
  let chosen = $state('nothing yet');

  const found = $derived(
    COMMANDS.filter((command) => command.name.toLowerCase().includes(query.trim().toLowerCase())),
  );

  function keys(event: KeyboardEvent): void {
    if (isComposingKey(event)) return;
    if (event.key === 'ArrowDown') at = Math.min(at + 1, found.length - 1);
    if (event.key === 'ArrowUp') at = Math.max(at - 1, 0);
    if (event.key !== 'Enter') return;

    event.preventDefault();
    run(found[at]);
  }

  function run(command: Command | undefined): void {
    if (command === undefined) return;

    chosen = command.name;
    searching = false;
  }
</script>

{#snippet rows(list: readonly Command[], cursor: number)}
  <ul class="col gap-1 list-reset">
    {#each list as command, index (command.name)}
      <li>
        <CommandItem selected={index === cursor} hint={command.hint} onclick={() => run(command)}>
          <span class="w-md shrink-0 aspect-square rounded-control surface-sunken bordered"></span>
          <span class="col gap-1 flex-1">
            <span class="truncate">{command.name}</span>
            <span class="accent-start truncate text-xs text-muted">{command.note}</span>
          </span>
        </CommandItem>
      </li>
    {/each}
  </ul>
{/snippet}

<DemoSection
  id="command"
  title="Command item"
  classes={[
    'command-item',
    'command-item-hint',
    'command-item-static',
    'is-selected',
    'modal-top',
    'modal-body-flush',
    'modal-footer-info',
    'list-reset',
    'w-sm',
    'w-md',
    'w-lg',
    'shrink-0',
    'accent-start',
  ]}
>
  <Card>
    <span class="eyebrow text-faint weight-semibold">In a plain list</span>
    {@render rows(COMMANDS, 1)}
    <CommandItem element="div" class="text-muted" aria-hidden="true">
      A static row: element="div" renders a plain element for a placeholder
    </CommandItem>
  </Card>
  <Card>
    <span class="eyebrow text-faint weight-semibold">
      In a top-anchored modal with a search header and an information footer
    </span>
    <div class="row wrap items-center gap-3">
      <Button onclick={() => (searching = true)}>Open the command palette</Button>
    </div>
    <p class="text-sm text-muted">Last run: {chosen}</p>
    <div class="row wrap items-center gap-3">
      {#each ['w-sm', 'w-md', 'w-lg'] as width (width)}
        <span class="{width} shrink-0 aspect-portrait rounded-control surface-sunken bordered"
        ></span>
      {/each}
      <span class="text-sm">A <mark>marked</mark> match inside ordinary text.</span>
    </div>
  </Card>
</DemoSection>

<Modal
  bind:open={searching}
  aria-label="Run a command"
  size="lg"
  placement="top"
  flushBody
  infoFooter
  onclose={() => {
    query = '';
    at = 0;
  }}
>
  {#snippet header()}
    <SearchField
      bind:value={query}
      label="Run a command"
      hideLabel
      class="flex-fill"
      autofocus
      placeholder="Run a command"
      oninput={() => (at = 0)}
      onkeydown={keys}
    />
  {/snippet}
  {#if found.length > 0}
    <div class="p-2">{@render rows(found, at)}</div>
  {:else}
    <p class="px-5 py-5 text-sm text-muted">No command matches.</p>
  {/if}
  {#snippet footer()}
    <span>{found.length} commands</span>
    <span>↑↓ move · ↵ run · esc close</span>
  {/snippet}
</Modal>
