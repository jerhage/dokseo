<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Popover from '$lib/components/Popover.svelte';
  import type { ModelFootprint } from '../../domain/model/model-footprint';
  import { tradeAspectName, tradeOffsOf } from '../../domain/engine/ocr-engine';
  import type { OcrEngine } from '../../domain/engine/ocr-engine';

  type Props = {
    readonly engine: OcrEngine;
    readonly model: ModelFootprint | null;
  };

  let { engine, model }: Props = $props();

  const trades = $derived(tradeOffsOf(engine.id, model));
</script>

<span class="row">
  <Popover label="About {engine.about}">
    {#snippet trigger(popover)}
      <Button
        variant="outline"
        size="sm"
        square
        pill
        aria-label="About {engine.about}"
        {...popover}
      >
        i
      </Button>
    {/snippet}
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
  </Popover>
</span>
