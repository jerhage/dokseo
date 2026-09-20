<script lang="ts">
  import type { Language } from '$lib/shared/language';

  type Props = { readonly title: string; readonly language: Language };

  let { title, language }: Props = $props();
</script>

<article class="card" aria-live="polite">
  <div class="cover">
    <span class="ring" aria-hidden="true"></span>
    <span class="label">Adding</span>
  </div>
  <h3 class="title" class:ko={language === 'ko'} lang={language}>{title}</h3>
  <p class="state">reading the file…</p>
</article>

<style>
  .card {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
    min-width: 0;
  }

  .cover {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--s-3);
    aspect-ratio: 2 / 3;
    overflow: hidden;
    border: 1px solid var(--c-accent-border-soft);
    border-radius: var(--r-4);
    background: var(--c-surface-card-quiet);
  }

  .ring {
    display: block;
    width: 26px;
    height: 26px;
    border: 2px solid var(--c-accent-border-soft);
    border-top-color: var(--c-accent);
    border-radius: var(--r-pill);
    animation: spin 900ms linear infinite;
  }

  .label {
    color: var(--c-text-5);
    font-family: var(--f-ui);
    font-size: 11.5px;
  }

  .title {
    margin: 0;
    overflow: hidden;
    color: var(--c-text-2);
    font-family: var(--f-ja);
    font-size: 13px;
    font-weight: 400;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .title.ko {
    font-family: var(--f-ko);
  }

  .state {
    margin: 0;
    color: var(--c-text-8);
    font-family: var(--f-ui);
    font-size: 11px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ring {
      animation: none;
      border-color: var(--c-accent-border-soft);
    }
  }
</style>
