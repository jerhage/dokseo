<script lang="ts">
  import Checkbox from '$lib/components/Checkbox.svelte';
  import Fieldset from '$lib/components/Fieldset.svelte';
  import Radio from '$lib/components/Radio.svelte';
  import { EDGE_CLICKS_LABEL } from './edge-clicks-setting';
  import type { TouchTurns } from './page-turn';
  import { TOUCH_TURNS_CHOICES, TOUCH_TURNS_LEGEND } from './touch-turns';
  import type { ShownTurnSettings } from './turn-settings';

  type Props = {
    readonly shown: ShownTurnSettings;
    readonly touchTurns: TouchTurns;
    readonly edgeClicksTurn: boolean;
    readonly ontouchturns: (turns: TouchTurns) => void;
    readonly onedgeclicksturn: (wanted: boolean) => void;
  };

  const { shown, touchTurns, edgeClicksTurn, ontouchturns, onedgeclicksturn }: Props = $props();

  const uid = $props.id();
</script>

{#if shown.touchTurns || shown.edgeClicks}
  <Fieldset legend={TOUCH_TURNS_LEGEND}>
    <div class="col gap-2">
      {#if shown.touchTurns}
        {#each TOUCH_TURNS_CHOICES as choice (choice.value)}
          <Radio
            name="{uid}-touch-turns"
            value={choice.value}
            group={touchTurns}
            onchange={() => ontouchturns(choice.value)}>{choice.label}</Radio
          >
        {/each}
      {/if}
      {#if shown.edgeClicks}
        <Checkbox
          checked={edgeClicksTurn}
          onchange={(event) => onedgeclicksturn(event.currentTarget.checked)}
          >{EDGE_CLICKS_LABEL}</Checkbox
        >
      {/if}
    </div>
  </Fieldset>
{/if}
