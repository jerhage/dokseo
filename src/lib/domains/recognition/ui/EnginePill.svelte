<script lang="ts">
  import type { Language } from '$lib/shared/language';
  import { chosenModel } from '../domain/model-footprint';
  import { engineStatus, NOT_INSTALLED, OCR_ENGINES, type EngineState } from '../domain/ocr-engine';
  import { deviceName } from '../domain/recognizer-session';

  type Props = {
    readonly engine: EngineState;
    readonly language: Language | null;
  };

  let { engine, language }: Props = $props();

  const uid = $props.id();

  let open = $state(false);
  let root = $state<HTMLDivElement | null>(null);
  let trigger = $state<HTMLButtonElement | null>(null);

  const session = $derived(engine.session);
  const model = $derived(
    language === null ? null : chosenModel(language, session?.modelId ?? null),
  );
  const status = $derived(engineStatus(engine));
  const device = $derived(session === null ? null : deviceName(session.device));

  function close(): void {
    if (!open) return;
    open = false;
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || !open) return;

    event.stopPropagation();
    event.preventDefault();
    open = false;
    trigger?.focus();
  }

  function onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (root !== null && next instanceof Node && root.contains(next)) return;
    close();
  }

  function onPointerDown(event: PointerEvent): void {
    const target = event.target;
    if (root !== null && target instanceof Node && root.contains(target)) return;
    close();
  }
</script>

<svelte:window onpointerdown={onPointerDown} />

{#if model !== null}
  <div class="engine" bind:this={root} onfocusout={onFocusOut}>
    <button
      class="pill"
      class:live={session !== null}
      type="button"
      bind:this={trigger}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-controls="{uid}-sheet"
      title={session?.modelId ?? model.modelId}
      onclick={() => (open = !open)}
      onkeydown={onKeydown}
    >
      <span class="dot {status.tone}" aria-hidden="true"></span>
      <span class="name">On-device · {model.engine}</span>
      <span class="state">{device ?? status.label}</span>
      <span class="caret" aria-hidden="true">▾</span>
    </button>

    {#if open}
      <div
        class="sheet"
        id="{uid}-sheet"
        role="dialog"
        tabindex="-1"
        aria-label="Engine for new captures"
        onkeydown={onKeydown}
      >
        <p class="caption">Engine for new captures</p>
        <ul class="list">
          {#each OCR_ENGINES as offered (offered.id)}
            <li>
              <label class="choice" class:on={offered.installed} class:off={!offered.installed}>
                <input
                  type="radio"
                  name="{uid}-engine"
                  value={offered.id}
                  checked={offered.installed}
                  disabled={!offered.installed}
                />
                <span class="choice-body">
                  <span class="choice-name">
                    {offered.id === 'on-device'
                      ? `${offered.name} · ${model.engine}`
                      : offered.name}
                  </span>
                  <span class="choice-note">
                    {offered.installed ? status.label : NOT_INSTALLED.label}
                  </span>
                </span>
              </label>
            </li>
          {/each}
        </ul>
        <p class="note">{status.note}</p>
        <a class="more" href="/settings">Engine settings…</a>
      </div>
    {/if}
  </div>
{/if}

<style>
  .engine {
    position: relative;
    flex: none;
  }

  .pill {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    padding: var(--s-1) var(--s-3);
    border: 1px solid var(--c-border-4);
    border-radius: var(--r-3);
    background: var(--c-surface-card-active);
    color: var(--c-text-7);
    font-family: var(--f-ui);
    font-size: 11.5px;
    white-space: nowrap;
    cursor: pointer;
  }

  .pill.live {
    border-color: var(--c-accent-line);
    color: var(--c-accent);
  }

  .pill:hover,
  .pill:focus-visible {
    border-color: var(--c-accent-border);
    color: var(--c-accent);
  }

  .dot {
    display: block;
    width: 6px;
    height: 6px;
    border-radius: var(--r-pill);
    background: var(--c-text-10);
  }

  .dot.ready {
    background: var(--c-accent);
  }

  .dot.busy {
    background: var(--c-warning);
  }

  .dot.bad {
    background: var(--c-error);
  }

  .state {
    color: var(--c-text-9);
    font-family: var(--f-mono);
    font-size: 10px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .caret {
    color: var(--c-text-11);
    font-size: 9px;
  }

  .sheet {
    position: absolute;
    top: calc(100% + var(--s-2));
    right: 0;
    z-index: var(--z-popover);
    width: 282px;
    padding: var(--s-2);
    border: 1px solid var(--c-border-6);
    border-radius: var(--r-6);
    background: var(--c-surface-popover);
    box-shadow: 0 22px 46px rgb(0 0 0 / 65%);
  }

  .caption {
    margin: 0;
    padding: var(--s-1) var(--s-2) var(--s-2);
    color: var(--c-text-10);
    font-family: var(--f-mono);
    font-size: 9.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .choice {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    padding: var(--s-2);
    border-radius: var(--r-3);
  }

  .choice.on {
    background: var(--c-surface-card-active);
    cursor: pointer;
  }

  .choice.off {
    cursor: default;
    opacity: 0.65;
  }

  .choice:has(input:focus-visible) {
    outline: 1px solid var(--c-accent-border-strong);
    outline-offset: -1px;
  }

  .choice-body {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .choice-name {
    color: var(--c-text-3);
    font-size: 12px;
  }

  .choice.on .choice-name {
    color: var(--c-text-1);
  }

  .choice-note {
    color: var(--c-text-8);
    font-family: var(--f-mono);
    font-size: 10px;
  }

  .note {
    margin: var(--s-2) 0 0;
    padding: var(--s-2);
    border-top: 1px solid var(--c-border-2);
    color: var(--c-text-8);
    font-size: 11px;
    line-height: 1.5;
  }

  .more {
    display: block;
    padding: 0 var(--s-2) var(--s-1);
    color: var(--c-accent);
    font-size: 11.5px;
    text-decoration: none;
  }

  .more:hover,
  .more:focus-visible {
    text-decoration: underline;
  }
</style>
