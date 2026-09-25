<script lang="ts">
  import { engineStatus } from '../../../../domain/engine/ocr-engine';
  import type { EngineSettingsView } from '../../engine-settings.svelte';
  import { activeDevice, activeEngine } from './engine-screen';

  type Props = { readonly view: EngineSettingsView };

  let { view }: Props = $props();

  const state = $derived(engineStatus(view.engine));
</script>

<div class="col gap-1 surface-sunken bordered rounded-container p-3">
  <p class="mono text-xs uppercase tracking-wide text-faint">Active engine</p>
  <p class="text-sm">{activeEngine(view.model)}</p>
  <p class="text-xs text-muted">{activeDevice(view.session, state)}</p>
</div>
