<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
  import Popover from '$lib/components/Popover.svelte';
  import Radio from '$lib/components/Radio.svelte';
  import type { Language } from '$lib/shared/language';
  import { chosenModel, knownModel } from '../../domain/model/model-footprint';
  import {
    engineFellBack,
    engineMismatch,
    engineStatus,
    NOT_INSTALLED,
    OCR_ENGINES,
  } from '../../domain/engine/ocr-engine';
  import type { EngineState } from '../../domain/engine/ocr-engine';
  import { deviceName } from '../../domain/engine/recognizer-session';
  import { statusVariant } from './engine-screen';

  type Props = {
    readonly engine: EngineState;
    readonly language: Language | null;
  };

  let { engine, language }: Props = $props();

  const uid = $props.id();

  const session = $derived(engine.session);
  const running = $derived(session === null ? null : knownModel(session.modelId));
  const model = $derived(running ?? (language === null ? null : chosenModel(language, null)));
  const mismatch = $derived(engineMismatch(session, language));
  const fellBack = $derived(engineFellBack(session));
  const status = $derived(engineStatus(engine));
  const device = $derived(session === null ? null : deviceName(session.device));
  const installed = OCR_ENGINES.find((offered) => offered.installed)?.id;
  const aside = 'text-xs border-t mt-2 pt-2 px-2';
</script>

{#if model !== null}
  <div>
    <Popover label="Engine for new captures" class="p-2">
      {#snippet trigger(popover)}
        <Button
          size="sm"
          pill
          wrap
          variant={session === null ? 'default' : 'outline'}
          title={session?.modelId ?? model.modelId}
          {...popover}
        >
          On-device · {model.engine}
          <Badge dot variant={statusVariant(status.tone)}>{device ?? status.label}</Badge>
          <ChevronDown class="btn-icon" />
        </Button>
      {/snippet}
      <p class="eyebrow mono text-faint px-2 pt-1 pb-2">Engine for new captures</p>
      <ul class="list-reset col gap-1">
        {#each OCR_ENGINES as offered (offered.id)}
          <li>
            <Radio
              variant="tile"
              name="{uid}-engine"
              value={offered.id}
              group={installed}
              disabled={!offered.installed}
              hint={offered.installed ? status.label : NOT_INSTALLED.label}
            >
              {offered.id === 'on-device' ? `${offered.name} · ${model.engine}` : offered.name}
            </Radio>
          </li>
        {/each}
      </ul>
      {#if mismatch !== null}
        <p class={aside}>{mismatch}</p>
      {/if}
      {#if fellBack !== null}
        <p class={aside}>{fellBack}</p>
      {/if}
      <p class={[aside, 'text-muted']}>{status.note}</p>
      <p class="text-sm px-2 pt-2 pb-1"><a href="/settings">Engine settings…</a></p>
    </Popover>
  </div>
{/if}
