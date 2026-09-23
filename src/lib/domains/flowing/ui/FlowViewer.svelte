<script lang="ts">
  import { match } from 'ts-pattern';
  import { ChromeFocus } from '$lib/shared/chrome-focus.svelte';
  import { chromeShown } from '$lib/shared/reader-chrome';
  import { TEXT_SETTINGS_LABEL } from '../domain/reading-settings';
  import type { ReadingSettings } from '../domain/reading-settings';
  import { CONTENTS_LABEL, NO_CONTENTS_LABEL } from './flow-contents';
  import type { ContentsEntry } from './flow-contents';
  import FlowContentsDialog from './FlowContentsDialog.svelte';
  import FlowSettingsDialog from './FlowSettingsDialog.svelte';
  import { FlowGestures } from './flow-gestures';
  import { flowMeta, progressLabel, SCRUB_STEP, tickOffsets } from './flow-progress';
  import { openFlowSurface } from './flow-surface';
  import { isTyping, pressesOnSpace, turnOrder } from './flow-turn';
  import type { FlowAction, FlowTurn, KeyTarget, PageTurner } from './flow-turn';
  import type { FlowBook, FlowView } from './flow-view.svelte';

  type Props = {
    readonly view: FlowView;
    readonly book: FlowBook;
  };

  const { view, book }: Props = $props();

  const GLYPHS: readonly string[] = ['‹', '›'];

  const TURN_LABELS: Readonly<Record<FlowTurn, string>> = {
    previous: 'Previous page',
    next: 'Next page',
  };

  let stage = $state<HTMLElement | null>(null);
  let topBar = $state<HTMLElement | null>(null);
  let bottomBar = $state<HTMLElement | null>(null);
  let chromeAsked = $state(true);
  let contentsOpen = $state(false);
  let settingsOpen = $state(false);
  let gestures: FlowGestures | null = null;
  const chapters = new Set<Document>();

  const chrome = new ChromeFocus(
    () => [topBar, bottomBar],
    () => [document.activeElement],
  );

  const curtain = $derived(view.curtain);
  const message = $derived(curtain.kind === 'notice' ? curtain.message : null);
  const panelOpen = $derived(contentsOpen || settingsOpen);
  const chromeAwake = $derived(chromeShown(chromeAsked, chrome.held || panelOpen));
  const reading = $derived(view.state.kind === 'ready');
  const contents = $derived(view.contents);
  const settings = $derived(view.settings);
  const progress = $derived(view.progress);
  const marker = $derived(progressLabel(progress));
  const meta = $derived(flowMeta(view.chapter, book.language));
  const turning = $derived(view.direction);
  const rtl = $derived(turning === 'rtl');
  const order = $derived(turnOrder(turning));
  const marks = $derived(tickOffsets(view.ticks, turning));

  function toggleChrome(): void {
    chromeAsked = !chromeAwake;
  }

  function isEditable(target: EventTarget): boolean {
    if (!('isContentEditable' in target)) return false;

    const editable = target.isContentEditable;
    return typeof editable === 'boolean' && editable;
  }

  function controlType(target: EventTarget): string | null {
    if (!('type' in target)) return null;

    const kind = target.type;
    return typeof kind === 'string' ? kind : null;
  }

  function controlRole(target: EventTarget): string | null {
    if (!('role' in target)) return null;

    const named = target.role;
    return typeof named === 'string' ? named : null;
  }

  function keyTarget(target: EventTarget | null): KeyTarget | null {
    if (target === null) return null;
    if (!('tagName' in target)) return null;

    const tagName = target.tagName;
    if (typeof tagName !== 'string') return null;

    return {
      tagName,
      type: controlType(target),
      role: controlRole(target),
      editable: isEditable(target),
    };
  }

  function textSelected(): boolean {
    for (const doc of [document, ...chapters]) {
      const selection = doc.getSelection();
      if (selection !== null && selection.rangeCount > 0 && !selection.isCollapsed) return true;
    }

    return false;
  }

  function pickEntry(entry: ContentsEntry): void {
    view.jumpTo(entry);
  }

  function chooseSettings(chosen: ReadingSettings): void {
    view.restyle(chosen);
  }

  function onkey(event: KeyboardEvent): void {
    if (event.defaultPrevented || panelOpen || gestures === null) return;

    const pressed = keyTarget(event.target);
    const move = gestures.keyed({
      key: event.key,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      typing: isTyping(pressed),
      pressesOnSpace: pressesOnSpace(pressed),
    });
    if (move.kind !== 'stay') event.preventDefault();
  }

  function apply(action: FlowAction): void {
    match(action)
      .with({ kind: 'nothing' }, () => undefined)
      .with({ kind: 'turn' }, () => undefined)
      .with({ kind: 'chrome' }, () => {
        toggleChrome();
      })
      .exhaustive();
  }

  function press(event: PointerEvent, x: number): void {
    gestures?.pressed({
      pointerId: event.pointerId,
      at: { x, y: event.clientY },
    });
  }

  function release(event: PointerEvent, x: number, width: number): void {
    const action = gestures?.released({
      pointerId: event.pointerId,
      at: { x, y: event.clientY },
      width,
      textSelected: textSelected(),
    });
    if (action !== undefined) apply(action);
  }

  function cancel(event: PointerEvent): void {
    gestures?.cancelled(event.pointerId);
  }

  function withinStage(event: PointerEvent, box: HTMLElement): number {
    return event.clientX - box.getBoundingClientRect().left;
  }

  function scrubbed(asked: string): void {
    view.seek(Number(asked));
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
    function refresh(): void {
      chrome.refresh();
    }

    window.addEventListener('focusin', refresh);
    window.addEventListener('focusout', refresh);

    return () => {
      window.removeEventListener('focusin', refresh);
      window.removeEventListener('focusout', refresh);
    };
  });

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
      contentsOpen = false;
      settingsOpen = false;
      chapters.clear();
    };
  });
</script>

<svelte:window onkeydown={onkey} />

<div class="screen">
  <div class="stage" bind:this={stage}></div>

  <header class="bar top" class:hushed={!chromeAwake} inert={!chromeAwake} bind:this={topBar}>
    <a class="back" href="/">
      <span class="glyph" aria-hidden="true">‹</span>
      Library
    </a>
    <div class="heading">
      <h1 class="title" class:ko={book.language === 'ko'} lang={book.language}>{book.title}</h1>
      <p class="meta">{meta}</p>
    </div>
    {#if reading}
      {#if contents.kind === 'listed'}
        <button class="tool" type="button" onclick={() => (contentsOpen = true)}>
          {CONTENTS_LABEL}
        </button>
      {:else}
        <p class="bare">{NO_CONTENTS_LABEL}</p>
      {/if}
      <button class="tool" type="button" onclick={() => (settingsOpen = true)}>
        {TEXT_SETTINGS_LABEL}
      </button>
    {/if}
  </header>

  <footer class="bar bottom" class:hushed={!chromeAwake} inert={!chromeAwake} bind:this={bottomBar}>
    <div class="turns" role="group" aria-label="Turn the page">
      {#each order as turn, slot (turn)}
        <button class="key" type="button" disabled={!reading} onclick={() => view.turn(turn)}>
          <span class="glyph" aria-hidden="true">{GLYPHS[slot]}</span>
          <span class="assistive">{TURN_LABELS[turn]}</span>
        </button>
      {/each}
    </div>

    <p class="marker" class:quiet={progress.kind === 'unknown'}>{marker}</p>

    {#if progress.kind === 'known'}
      <div class="gauge">
        <input
          class="scrub"
          class:rtl
          type="range"
          min={0}
          max={1}
          step={SCRUB_STEP}
          value={progress.fraction}
          style:--fill="{progress.percent}%"
          aria-label="Reading progress"
          aria-valuetext={marker}
          onchange={(event) => scrubbed(event.currentTarget.value)}
        />
        {#each marks as offset, slot (slot)}
          <span class="tick" aria-hidden="true" style:--at="{offset}%"></span>
        {/each}
      </div>
    {/if}
  </footer>

  {#if contentsOpen && contents.kind === 'listed'}
    <FlowContentsDialog
      entries={contents.entries}
      currentKey={view.currentKey}
      onpick={pickEntry}
      onclose={() => (contentsOpen = false)}
    />
  {/if}

  {#if settingsOpen}
    <FlowSettingsDialog
      {settings}
      onchoose={chooseSettings}
      onclose={() => (settingsOpen = false)}
    />
  {/if}

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
    overflow: hidden;
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

  .bar {
    position: absolute;
    box-sizing: border-box;
    inset-inline: 0;
    z-index: var(--z-chrome);
    display: flex;
    align-items: center;
    gap: var(--s-3);
    padding: var(--s-2) var(--s-4);
    background: var(--c-surface-chrome);
    opacity: 1;
    transition: opacity 200ms ease;
  }

  .bar.hushed {
    opacity: 0;
    pointer-events: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .bar {
      transition: none;
    }
  }

  .top {
    inset-block-start: 0;
    border-bottom: 1px solid var(--c-border-1);
  }

  .bottom {
    inset-block-end: 0;
    border-top: 1px solid var(--c-border-1);
  }

  .back {
    display: flex;
    flex: none;
    align-items: center;
    gap: var(--s-1);
    padding: var(--s-1) var(--s-2);
    border: 1px solid var(--c-border-4);
    border-radius: var(--r-4);
    background: var(--c-surface-button);
    color: var(--c-text-5);
    font-size: 11.5px;
    text-decoration: none;
  }

  .back:hover,
  .back:focus-visible {
    border-color: var(--c-accent-border);
    color: var(--c-accent);
  }

  .tool {
    flex: none;
    padding: var(--s-1) var(--s-2);
    border: 1px solid var(--c-border-4);
    border-radius: var(--r-4);
    background: var(--c-surface-button);
    color: var(--c-text-5);
    font-family: var(--f-ui);
    font-size: 11.5px;
    cursor: pointer;
  }

  .tool:hover,
  .tool:focus-visible {
    border-color: var(--c-accent-border);
    color: var(--c-accent);
  }

  .bare {
    flex: none;
    margin: 0;
    color: var(--c-text-8);
    font-size: 11px;
  }

  .heading {
    display: flex;
    flex: 1 1 auto;
    align-items: baseline;
    gap: var(--s-2);
    min-width: 0;
  }

  .title {
    flex: 0 1 auto;
    margin: 0;
    overflow: hidden;
    color: var(--c-text-1);
    font-family: var(--f-ja);
    font-size: 13.5px;
    font-weight: 400;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .title.ko {
    font-family: var(--f-ko);
  }

  .meta {
    flex: 0 1 auto;
    margin: 0;
    overflow: hidden;
    color: var(--c-text-8);
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .turns {
    display: flex;
    flex: none;
    gap: var(--s-1);
  }

  .key {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border: 1px solid var(--c-border-4);
    border-radius: var(--r-pill);
    background: var(--c-surface-button);
    color: var(--c-text-5);
    font-family: var(--f-ui);
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
  }

  .key:hover:not(:disabled),
  .key:focus-visible {
    border-color: var(--c-accent-border);
    color: var(--c-accent);
  }

  .key:disabled {
    cursor: default;
    opacity: 0.4;
  }

  .glyph {
    display: block;
  }

  .assistive {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .marker {
    flex: none;
    margin: 0;
    color: var(--c-text-5);
    font-family: var(--f-mono);
    font-size: 11px;
    letter-spacing: 0.02em;
  }

  .marker.quiet {
    color: var(--c-text-8);
    font-family: var(--f-ui);
  }

  .gauge {
    position: relative;
    flex: 1 1 auto;
    min-width: 0;
  }

  .tick {
    position: absolute;
    inset-block: 0;
    left: var(--at);
    width: 1px;
    background: var(--c-text-10);
    transform: translateX(-0.5px);
    pointer-events: none;
  }

  .scrub {
    display: block;
    width: 100%;
    height: 3px;
    margin: 0;
    padding: 0;
    border-radius: var(--r-pill);
    background: linear-gradient(
      to right,
      var(--c-accent) var(--fill),
      var(--c-border-2) var(--fill)
    );
    appearance: none;
    cursor: pointer;
  }

  .scrub.rtl {
    direction: rtl;
    background: linear-gradient(
      to left,
      var(--c-accent) var(--fill),
      var(--c-border-2) var(--fill)
    );
  }

  .scrub::-webkit-slider-thumb {
    width: 11px;
    height: 11px;
    border: 0;
    border-radius: var(--r-pill);
    background: var(--c-accent);
    appearance: none;
  }

  .scrub::-moz-range-thumb {
    width: 11px;
    height: 11px;
    border: 0;
    border-radius: var(--r-pill);
    background: var(--c-accent);
  }

  .scrub:focus-visible {
    outline: 1px solid var(--c-accent-border-strong);
    outline-offset: 4px;
  }

  .curtain {
    position: absolute;
    inset: 0;
    z-index: calc(var(--z-chrome) + 1);
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
