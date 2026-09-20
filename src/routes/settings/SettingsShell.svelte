<script lang="ts">
  import type { Snippet } from 'svelte';

  type Section = 'engine' | 'storage';

  type Props = {
    readonly current: Section;
    readonly aside?: Snippet;
    readonly children: Snippet;
  };

  let { current, aside, children }: Props = $props();

  const sections: readonly {
    readonly id: Section;
    readonly name: string;
    readonly href: string;
  }[] = [
    { id: 'engine', name: 'OCR engine', href: '/settings' },
    { id: 'storage', name: 'Storage', href: '/settings/storage' },
  ];
</script>

<div class="screen">
  <nav class="rail" aria-label="Settings">
    <div class="brand">
      <a class="mark" href="/" aria-label="Your library">
        <span lang="ja" aria-hidden="true">読</span>
      </a>
      <span class="name">Settings</span>
    </div>
    {#each sections as section (section.id)}
      <a
        class="item"
        class:current={section.id === current}
        href={section.href}
        aria-current={section.id === current ? 'page' : undefined}
      >
        <span class="dot" aria-hidden="true"></span>
        {section.name}
      </a>
    {/each}
    <div class="spacer"></div>
    {#if aside !== undefined}
      {@render aside()}
    {/if}
    <a class="back" href="/">Back to your library</a>
  </nav>

  <main class="main">
    {@render children()}
  </main>
</div>

<style>
  .screen {
    display: flex;
    min-height: 100vh;
    background: var(--c-surface-app);
    color: var(--c-text-2);
    font-family: var(--f-ui);
  }

  .rail {
    display: flex;
    flex: none;
    flex-direction: column;
    gap: var(--s-1);
    width: 190px;
    padding: var(--s-4) var(--s-3);
    border-right: 1px solid var(--c-border-1);
    background: var(--c-surface-rail);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    padding: 0 var(--s-2) var(--s-4);
  }

  .mark {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: var(--r-3);
    background: var(--c-accent);
    color: var(--c-accent-text);
    font-family: var(--f-ja);
    font-size: 13px;
    text-decoration: none;
    cursor: pointer;
  }

  .mark:hover {
    opacity: 0.85;
  }

  .item:focus-visible,
  .mark:focus-visible {
    outline: 1px solid var(--c-accent-border-strong);
    outline-offset: 1px;
  }

  .name {
    color: var(--c-text-4);
    font-size: 12.5px;
  }

  .item {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    padding: var(--s-2) var(--s-3);
    border-radius: var(--r-3);
    color: var(--c-text-7);
    font-size: 12.5px;
    text-decoration: none;
  }

  .item.current {
    background: var(--c-surface-card-active);
    color: var(--c-text-1);
  }

  .item .dot {
    display: block;
    width: 5px;
    height: 5px;
    border-radius: var(--r-pill);
    background: var(--c-accent);
    opacity: 0.35;
  }

  .item.current .dot {
    opacity: 1;
  }

  .spacer {
    flex: 1 1 auto;
  }

  .back {
    margin-top: var(--s-3);
    padding: var(--s-2) var(--s-3);
    border: 1px solid var(--c-border-4);
    border-radius: var(--r-3);
    color: var(--c-text-5);
    font-size: 11.5px;
    text-align: center;
    text-decoration: none;
  }

  .back:hover,
  .back:focus-visible {
    border-color: var(--c-accent-border);
    color: var(--c-accent);
  }

  .main {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-width: 0;
  }
</style>
