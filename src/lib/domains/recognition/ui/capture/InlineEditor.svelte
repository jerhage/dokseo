<script lang="ts">
  import { match } from 'ts-pattern';
  import Button from '$lib/components/Button.svelte';
  import type { KeyHint } from '$lib/components/key-hints';
  import KeyHints from '$lib/components/KeyHints.svelte';
  import Textarea from '$lib/components/Textarea.svelte';
  import type { Language } from '$lib/shared/language';
  import { writerKey } from './editor-keys';

  type Props = {
    readonly id: string;
    readonly label: string;
    readonly value: string;
    readonly language: Language | null;
    readonly note: boolean;
    readonly oninput: (value: string) => void;
    readonly onsave: () => void;
    readonly onabandon: () => void;
  };

  let { id, label, value, language, note, oninput, onsave, onabandon }: Props = $props();

  const WRITER_KEYS: readonly KeyHint[] = [
    { keys: ['Esc'], does: 'cancels' },
    { keys: ['⌘/Ctrl', 'Enter'], does: 'saves' },
  ];

  let area = $state<HTMLTextAreaElement | null>();

  $effect(() => {
    area?.focus();
  });

  function commit(event: SubmitEvent): void {
    event.preventDefault();
    onsave();
  }

  function keys(event: KeyboardEvent): void {
    match(writerKey(event))
      .with('abandon', () => {
        event.preventDefault();
        onabandon();
      })
      .with('save', () => {
        event.preventDefault();
        onsave();
      })
      .with('type', () => undefined)
      .exhaustive();
  }
</script>

<form class={['col gap-2', { 'accent-start': note }]} onsubmit={commit}>
  <Textarea
    bind:ref={area}
    {id}
    {value}
    rows={3}
    lang={note ? null : language}
    class={note ? undefined : 'text-lg'}
    aria-label={label}
    oninput={(event) => oninput(event.currentTarget.value)}
    onkeydown={keys}
  />
  <div class="row wrap items-center gap-2">
    <KeyHints hints={WRITER_KEYS} variant="text" element="span" class="flex-fill" />
    <span class="row items-center gap-2 ms-auto">
      <Button variant="ghost" size="sm" onclick={onabandon}>Cancel</Button>
      <Button variant="primary" size="sm" type="submit">Save</Button>
    </span>
  </div>
</form>
