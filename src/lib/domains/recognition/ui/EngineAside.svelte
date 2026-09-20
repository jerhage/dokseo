<script lang="ts">
  import { engineStatus } from '../domain/ocr-engine';
  import { deviceName } from '../domain/recognizer-session';
  import type { EngineSettingsView } from './engine-settings.svelte';

  type Props = { readonly view: EngineSettingsView };

  let { view }: Props = $props();

  const model = $derived(view.model);
  const session = $derived(view.session);
  const state = $derived(engineStatus(view.engine));
</script>

<div class="active">
  <p class="caption">Active engine</p>
  <p class="engine">{model === null ? 'None' : `On-device · ${model.engine}`}</p>
  <p class="device">
    {session === null ? state.label : `running on the ${deviceName(session.device)}`}
  </p>
</div>

<style>
  .active {
    padding: var(--s-3);
    border: 1px solid var(--c-border-2);
    border-radius: var(--r-4);
    background: var(--c-surface-chip);
  }

  .caption {
    margin: 0;
    color: var(--c-text-10);
    font-family: var(--f-mono);
    font-size: 9.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .engine {
    margin: var(--s-2) 0 0;
    color: var(--c-accent);
    font-size: 11.5px;
  }

  .device {
    margin: var(--s-1) 0 0;
    color: var(--c-text-9);
    font-size: 10.5px;
  }
</style>
