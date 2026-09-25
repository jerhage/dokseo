<script lang="ts">
  import Accordion from '$lib/components/Accordion.svelte';
  import AccordionItem from '$lib/components/AccordionItem.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Radio from '$lib/components/Radio.svelte';
  import {
    NOT_INSTALLED,
    OCR_ENGINES,
    ON_DEVICE_ENGINE,
    tradeAspectName,
    tradeOffsOf,
  } from '../../../../domain/engine/ocr-engine';
  import type { ModelFootprint } from '../../../../domain/model/model-footprint';
  import { engineBadge, verdictVariant } from './engine-page';

  type Props = { readonly model: ModelFootprint };

  let { model }: Props = $props();

  const uid = $props.id();

  const heading = 'px-1 text-xs uppercase tracking-wide text-muted weight-semibold';
</script>

<section class="col gap-2" aria-labelledby="{uid}-engines">
  <h2 id="{uid}-engines" class={heading}>Engine</h2>
  <div
    class="surface bordered rounded-container overflow-hidden"
    role="radiogroup"
    aria-labelledby="{uid}-engines"
  >
    <ul class="list-reset">
      {#each OCR_ENGINES as engine, index (engine.id)}
        {@const badge = engineBadge(engine)}
        <li class={['col gap-2 px-4 py-3', { 'border-t': index > 0 }]}>
          <div class="row items-start justify-between gap-3">
            <Radio
              name="{uid}-engine-choice"
              value={engine.id}
              group={ON_DEVICE_ENGINE.id}
              disabled={!engine.installed}
              hint={engine.summary}
              class="flex-1"
            >
              <span class="row wrap items-center gap-2">
                {engine.name}
                <Badge>{engine.kind}</Badge>
              </span>
            </Radio>
            <Badge dot variant={badge.variant} class="shrink-0">{badge.label}</Badge>
          </div>
          {#if !engine.installed}
            <p class="text-xs text-faint">{NOT_INSTALLED.note}</p>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
</section>

<section class="col gap-2" aria-labelledby="{uid}-trades">
  <h2 id="{uid}-trades" class={heading}>What each engine costs you</h2>
  <Accordion>
    {#each OCR_ENGINES as engine (engine.id)}
      <AccordionItem title={engine.name}>
        <div class="col gap-3">
          <ul class="list-reset col gap-3" aria-label="About {engine.about}">
            {#each tradeOffsOf(engine.id, model) as trade (trade.aspect)}
              <li class="col items-start gap-1">
                <Badge dot variant={verdictVariant(trade.verdict)}>
                  {tradeAspectName(trade.aspect)}
                </Badge>
                <span class="text-sm">{trade.value}</span>
              </li>
            {/each}
          </ul>
          <p class="text-xs border-t pt-2">{engine.footnote}</p>
        </div>
      </AccordionItem>
    {/each}
  </Accordion>
</section>
