<script lang="ts">
  import { anchoredTo } from '$lib/platform/dom/anchored-popover';
  import type { ModelFootprint } from '../domain/model-footprint';
  import { tradeAspectName, tradeOffsOf, type OcrEngine } from '../domain/ocr-engine';

  type Props = {
    readonly engine: OcrEngine;
    readonly model: ModelFootprint | null;
  };

  let { engine, model }: Props = $props();

  const trades = $derived(tradeOffsOf(engine.id, model));

  const uid = $props.id();

  let trigger = $state<HTMLButtonElement | null>(null);
</script>

<span class="trade">
  <button
    class="mark"
    type="button"
    bind:this={trigger}
    aria-haspopup="dialog"
    aria-label="About {engine.about}"
    popovertarget="{uid}-sheet"
  >
    i
  </button>

  <span
    class="sheet"
    id="{uid}-sheet"
    popover
    role="dialog"
    aria-label="About {engine.about}"
    use:anchoredTo={() => trigger}
  >
    <span class="caption">{engine.name}</span>
    <span class="rows">
      {#each trades as trade (trade.aspect)}
        <span class="row">
          <span class="dot {trade.verdict}" aria-hidden="true"></span>
          <span class="aspect">{tradeAspectName(trade.aspect)}</span>
          <span class="value">{trade.value}</span>
        </span>
      {/each}
    </span>
    <span class="footnote">{engine.footnote}</span>
  </span>
</span>

<style>
  .trade {
    display: inline-flex;
  }

  .mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    padding: 0;
    border: 1px solid var(--c-border-7);
    border-radius: var(--r-pill);
    background: transparent;
    color: var(--c-text-7);
    font-family: Georgia, serif;
    font-size: 9.5px;
    font-style: italic;
    font-weight: 600;
    cursor: pointer;
  }

  .mark:hover,
  .mark:focus-visible {
    border-color: var(--c-accent-border);
    background: var(--c-accent-wash-soft);
    color: var(--c-accent);
  }

  .sheet {
    position: fixed;
    inset: auto;
    width: 294px;
    margin: 0;
    padding: var(--s-3);
    overflow: visible;
    border: 1px solid var(--c-border-6);
    border-radius: var(--r-6);
    background: var(--c-surface-popover);
    box-shadow: 0 20px 44px rgb(0 0 0 / 65%);
    color: inherit;
  }

  .sheet:popover-open {
    display: flex;
    flex-direction: column;
  }

  .caption {
    margin-bottom: var(--s-3);
    color: var(--c-text-10);
    font-family: var(--f-mono);
    font-size: 9.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .rows {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
  }

  .row {
    display: flex;
    align-items: baseline;
    gap: var(--s-2);
  }

  .dot {
    flex: none;
    width: 5px;
    height: 5px;
    border-radius: var(--r-pill);
    background: var(--c-warning);
    transform: translateY(-2px);
  }

  .dot.good {
    background: var(--c-accent);
  }

  .aspect {
    flex: none;
    width: 52px;
    color: var(--c-text-9);
    font-family: var(--f-mono);
    font-size: 9.5px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .value {
    flex: 1 1 auto;
    color: var(--c-text-4);
    font-size: 11.5px;
    line-height: 1.45;
  }

  .footnote {
    margin-top: var(--s-3);
    padding-top: var(--s-2);
    border-top: 1px solid var(--c-border-2);
    color: var(--c-text-9);
    font-size: 10.5px;
    line-height: 1.5;
  }
</style>
