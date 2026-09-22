<script lang="ts">
  import { FlowGestures } from './flow-gestures';
  import { openFlowSurface } from './flow-surface';
  import { isTyping } from './flow-turn';
  import type { PageTurner, TypingTarget } from './flow-turn';
  import type { FlowBook, FlowView } from './flow-view.svelte';

  type Props = {
    readonly view: FlowView;
    readonly book: FlowBook;
  };

  const { view, book }: Props = $props();

  let stage = $state<HTMLElement | null>(null);
  let gestures: FlowGestures | null = null;
  const chapters = new Set<Document>();

  const curtain = $derived(view.curtain);
  const message = $derived(curtain.kind === 'notice' ? curtain.message : null);

  function isEditable(target: EventTarget): boolean {
    if (!('isContentEditable' in target)) return false;

    const editable = target.isContentEditable;
    return typeof editable === 'boolean' && editable;
  }

  function typingTarget(target: EventTarget | null): TypingTarget | null {
    if (target === null) return null;
    if (!('tagName' in target)) return null;

    const tagName = target.tagName;
    if (typeof tagName !== 'string') return null;

    return { tagName, editable: isEditable(target) };
  }

  function textSelected(): boolean {
    for (const doc of [document, ...chapters]) {
      const selection = doc.getSelection();
      if (selection !== null && selection.rangeCount > 0 && !selection.isCollapsed) return true;
    }

    return false;
  }

  function onkey(event: KeyboardEvent): void {
    if (event.defaultPrevented || gestures === null) return;

    const move = gestures.keyed({
      key: event.key,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      typing: isTyping(typingTarget(event.target)),
    });
    if (move.kind !== 'stay') event.preventDefault();
  }

  function press(event: PointerEvent, x: number): void {
    gestures?.pressed({
      pointerId: event.pointerId,
      at: { x, y: event.clientY },
    });
  }

  function release(event: PointerEvent, x: number, width: number): void {
    gestures?.released({
      pointerId: event.pointerId,
      at: { x, y: event.clientY },
      width,
      textSelected: textSelected(),
    });
  }

  function cancel(event: PointerEvent): void {
    gestures?.cancelled(event.pointerId);
  }

  function withinStage(event: PointerEvent, box: HTMLElement): number {
    return event.clientX - box.getBoundingClientRect().left;
  }

  function bind(doc: Document, pages: PageTurner): void {
    gestures ??= new FlowGestures(pages);
    chapters.add(doc);

    doc.addEventListener('keydown', onkey);
    doc.addEventListener('pointerdown', (event) => press(event, event.clientX));
    doc.addEventListener('pointerup', (event) =>
      release(event, event.clientX, doc.defaultView?.innerWidth ?? 0),
    );
    doc.addEventListener('pointercancel', cancel);
  }

  $effect(() => {
    const host = stage;
    const held = book;
    if (host === null) return;

    const began = (event: PointerEvent): void => press(event, withinStage(event, host));
    const ended = (event: PointerEvent): void =>
      release(event, withinStage(event, host), host.clientWidth);

    host.addEventListener('pointerdown', began);
    host.addEventListener('pointerup', ended);
    host.addEventListener('pointercancel', cancel);

    void view.open(held, (opening) => openFlowSurface(host, opening, bind));
    return () => {
      host.removeEventListener('pointerdown', began);
      host.removeEventListener('pointerup', ended);
      host.removeEventListener('pointercancel', cancel);
      view.close();
      gestures = null;
      chapters.clear();
    };
  });
</script>

<svelte:window onkeydown={onkey} />

<div class="screen">
  <div class="stage" bind:this={stage}></div>

  <a class="exit" href="/">
    <span class="glyph" aria-hidden="true">‹</span>
    Library
  </a>

  {#if curtain.kind === 'opening'}
    <div class="curtain">
      <p class="notice" aria-live="polite">Opening this book…</p>
    </div>
  {:else if message !== null}
    <div class="curtain">
      <p class="notice" aria-live="polite">{message}</p>
      <a class="escape" href="/">Back to your library</a>
    </div>
  {/if}
</div>

<style>
  .screen {
    position: relative;
    height: 100vh;
    background: var(--c-surface-void);
    color: var(--c-text-2);
    font-family: var(--f-ui);
  }

  .stage {
    height: 100%;
  }

  .stage :global(foliate-view) {
    display: block;
    width: 100%;
    height: 100%;
  }

  .exit {
    position: absolute;
    inset-block-start: var(--s-2);
    inset-inline-start: var(--s-2);
    display: inline-flex;
    align-items: center;
    gap: var(--s-1);
    padding: var(--s-1) var(--s-2);
    border-radius: var(--r-4);
    opacity: 0.35;
    color: var(--c-text-7);
    font-size: 11px;
    text-decoration: none;
    transition: opacity 120ms ease;
  }

  .exit:hover,
  .exit:focus-visible {
    background: var(--c-surface-chrome);
    opacity: 1;
  }

  .glyph {
    font-size: 13px;
    line-height: 1;
  }

  .curtain {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--s-3);
    padding: var(--s-5);
    background: var(--c-viewer-gradient);
  }

  .notice {
    max-width: 44ch;
    margin: 0;
    color: var(--c-text-7);
    font-size: 12.5px;
    text-align: center;
  }

  .escape {
    padding: var(--s-2) var(--s-3);
    border-radius: var(--r-4);
    background: var(--c-accent);
    color: var(--c-accent-text);
    font-size: 12px;
    font-weight: 600;
    text-decoration: none;
  }
</style>
