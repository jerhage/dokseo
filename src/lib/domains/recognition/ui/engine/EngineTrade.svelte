<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import { anchoredTo } from '$lib/platform/dom/anchored-popover';
  import type { ModelFootprint } from '../../domain/model/model-footprint';
  import { tradeAspectName, tradeOffsOf } from '../../domain/engine/ocr-engine';
  import type { OcrEngine } from '../../domain/engine/ocr-engine';
  import './engine-trade.css';

  type Props = {
    readonly engine: OcrEngine;
    readonly model: ModelFootprint | null;
  };

  let { engine, model }: Props = $props();

  const trades = $derived(tradeOffsOf(engine.id, model));

  const uid = $props.id();

  let trigger = $state<HTMLButtonElement | undefined>();
</script>

<span class="engine-trade row">
  <Button
    variant="outline"
    size="sm"
    square
    pill
    bind:ref={trigger}
    aria-haspopup="dialog"
    aria-label="About {engine.about}"
    popovertarget="{uid}-sheet"
  >
    i
  </Button>

  <div
    class="sheet surface-raised bordered rounded-container shadow-lg m-0 p-4"
    id="{uid}-sheet"
    popover
    role="dialog"
    aria-label="About {engine.about}"
    use:anchoredTo={() => trigger ?? null}
  >
    <div class="col gap-3">
      <p class="mono text-xs uppercase tracking-wide text-faint">{engine.name}</p>
      <ul class="list-reset col gap-3">
        {#each trades as trade (trade.aspect)}
          <li class="col items-start gap-1">
            <Badge dot variant={trade.verdict === 'good' ? 'success' : 'warning'}>
              {tradeAspectName(trade.aspect)}
            </Badge>
            <span class="text-sm">{trade.value}</span>
          </li>
        {/each}
      </ul>
      <p class="text-xs text-muted border-t pt-2">{engine.footnote}</p>
    </div>
  </div>
</span>
