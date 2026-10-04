<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Field from '$lib/components/Field.svelte';
  import Input from '$lib/components/Input.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import { readElement } from './access-tree';

  type FocusEntry = {
    readonly id: number;
    readonly event: string;
    readonly detail: string;
  };

  const KEPT_ENTRIES = 10;

  let open = $state(false);
  let wrapFocus = $state(false);
  let entries = $state<readonly FocusEntry[]>([]);
  let next = 1;
  let area = $state<HTMLElement>();

  function record(event: string, detail: string): void {
    entries = [{ id: next, event, detail }, ...entries].slice(0, KEPT_ENTRIES);
    next += 1;
  }

  function described(element: Element): string {
    const reading = readElement(element);
    return reading.name === '' ? reading.role : `${reading.role} “${reading.name}”`;
  }

  function inside(target: EventTarget | null): target is Element {
    return target instanceof Element && area !== undefined && area.contains(target);
  }

  function onfocusin(event: FocusEvent): void {
    if (inside(event.target)) record('focus', described(event.target));
  }

  function onfocusout(event: FocusEvent): void {
    if (!inside(event.target) || event.relatedTarget !== null) return;
    queueMicrotask(() => {
      const active = document.activeElement;
      if (active === null || active === document.body) {
        record('focus left', 'nothing in the page has focus');
      }
    });
  }

  function show(): void {
    record('open', wrapFocus ? 'showModal(), wrapFocus on' : 'showModal()');
    open = true;
  }
</script>

<svelte:document {onfocusin} {onfocusout} />

<DocsDemo label="Focus in a modal dialog">
  {#snippet controls()}
    <Button size="sm" variant="ghost" onclick={() => (entries = [])}>Clear</Button>
  {/snippet}
  {#snippet caption()}
    Dokseo's real <code>Modal</code>. Open it with the keyboard or the mouse, press Tab past the
    last control, then close it with Escape or Done, and watch where focus goes.
  {/snippet}
  <div class="stack-md" bind:this={area}>
    <div class="row wrap items-center gap-3">
      <Button variant="primary" size="sm" onclick={show}>Open reading settings</Button>
      <Toggle bind:checked={wrapFocus}>Wrap Tab at the ends</Toggle>
    </div>
    <Modal
      title="Reading settings"
      bind:open
      {wrapFocus}
      size="sm"
      onclose={() => record('close', 'the dialog closed')}
    >
      <div class="stack-md">
        <Field label="Text size">
          {#snippet children(control)}
            <Input {...control} type="number" value="100" />
          {/snippet}
        </Field>
        <Toggle>Show furigana</Toggle>
      </div>
      {#snippet footer(hide)}
        <Button variant="ghost" size="sm" onclick={hide}>Cancel</Button>
        <Button variant="primary" size="sm" onclick={hide}>Done</Button>
      {/snippet}
    </Modal>
    {#if entries.length > 0}
      <ol class="stack-sm m-0 text-sm" aria-label="Focus log">
        {#each entries as entry (entry.id)}
          <li>
            <span class="mono text-xs text-muted">{entry.event}</span>
            {entry.detail}
          </li>
        {/each}
      </ol>
    {/if}
  </div>
</DocsDemo>
