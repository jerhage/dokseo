<script lang="ts">
  import type { Language } from '$lib/shared/language';
  import { engineName, modelFootprint } from '../domain/model-footprint';
  import { deviceName, type RecognizerSession } from '../domain/recognizer-session';

  type Props = {
    readonly session: RecognizerSession | null;
    readonly language: Language | null;
  };

  let { session, language }: Props = $props();

  const footprint = $derived(language === null ? null : modelFootprint(language));
  const name = $derived(
    session === null ? (footprint?.engine ?? null) : engineName(session.modelId),
  );
  const modelId = $derived(session?.modelId ?? footprint?.modelId ?? '');
  const device = $derived(session === null ? null : deviceName(session.device));
</script>

{#if name !== null}
  <a class="pill" class:live={session !== null} href="/settings" title={modelId}>
    <span class="dot" aria-hidden="true"></span>
    <span class="name">On-device · {name}</span>
    <span class="device">{device ?? 'not loaded'}</span>
  </a>
{/if}

<style>
  .pill {
    display: flex;
    flex: none;
    align-items: center;
    gap: var(--s-2);
    padding: var(--s-1) var(--s-3);
    border: 1px solid var(--c-border-4);
    border-radius: var(--r-3);
    background: var(--c-surface-card-active);
    color: var(--c-text-7);
    font-size: 11.5px;
    text-decoration: none;
    white-space: nowrap;
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

  .pill.live .dot {
    background: var(--c-accent);
  }

  .device {
    color: var(--c-text-9);
    font-family: var(--f-mono);
    font-size: 10px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
</style>
