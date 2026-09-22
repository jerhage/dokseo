<script lang="ts">
  import { FLOWING_TEXT_NOTICE } from './flow-notice';
</script>

<div class="screen">
  <p class="notice" aria-live="polite">{FLOWING_TEXT_NOTICE}</p>
  <a class="escape" href="/">Back to your library</a>
</div>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--s-3);
    height: 100vh;
    padding: var(--s-5);
    background: var(--c-viewer-gradient);
    color: var(--c-text-2);
    font-family: var(--f-ui);
  }

  .notice {
    max-width: 44ch;
    margin: 0;
    color: var(--c-text-7);
    font-size: 12.5px;
    text-align: center;
  }

  .escape {
    padding: var(--s-2) var(--s-3);
    border-radius: var(--r-4);
    background: var(--c-accent);
    color: var(--c-accent-text);
    font-size: 12px;
    font-weight: 600;
    text-decoration: none;
  }
</style>
