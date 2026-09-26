<script lang="ts">
  import { tick } from 'svelte';
  import CommandItem from '$lib/components/CommandItem.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import type { Language } from '$lib/shared/language';
  import { CONTENTS_LABEL, entryLabel, indentDepth } from './flow-contents';
  import type { ContentsEntry } from './flow-contents';
  import './flow-contents-dialog.css';

  type Props = {
    open: boolean;
    readonly entries: readonly ContentsEntry[];
    readonly language: Language;
    readonly currentKey: string | null;
    readonly onpick: (entry: ContentsEntry) => void;
  };

  let { open = $bindable(false), entries, language, currentKey, onpick }: Props = $props();

  let list = $state<HTMLElement | null>(null);

  $effect(() => {
    if (!open) return;

    void tick().then(() => {
      const here = list?.querySelector('[aria-current="true"]');
      if (!(here instanceof HTMLElement)) return;

      here.focus();
      here.scrollIntoView({ block: 'center' });
    });
  });

  function pick(entry: ContentsEntry): void {
    onpick(entry);
    open = false;
  }
</script>

<Modal bind:open title={CONTENTS_LABEL} size="sm" body="flush">
  <ul class="flow-contents list-reset col gap-0 px-3 pb-4" lang={language} bind:this={list}>
    {#each entries as entry (entry.key)}
      <li class="contents-row" style:--depth={indentDepth(entry.depth)}>
        {#if entry.kind === 'link'}
          <CommandItem
            class={{ 'text-faint': entry.label === null }}
            selected={entry.key === currentKey}
            aria-current={entry.key === currentKey ? 'true' : undefined}
            onclick={() => pick(entry)}
          >
            {#if entry.label === null}
              <em lang="en">{entryLabel(entry)}</em>
            {:else}
              {entryLabel(entry)}
            {/if}
          </CommandItem>
        {:else}
          <p class="text-xs uppercase tracking-wide text-muted px-3 py-2">{entry.label}</p>
        {/if}
      </li>
    {/each}
  </ul>
</Modal>
