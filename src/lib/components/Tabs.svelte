<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { TABS_VARIANTS } from './classes';
  import type { TabsVariant } from './classes';
  import { landOn, tabMove } from './roving';
  import { shownTab } from './tabs';
  import type { TabItem } from './tabs';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
    tabs: readonly TabItem[];
    label: string;
    selected?: string;
    variant?: TabsVariant;
    onselect?: (id: string) => void;
    panel: Snippet<[TabItem]>;
  };

  let {
    tabs,
    label,
    selected = $bindable(),
    variant = 'underline',
    onselect,
    panel,
    class: className,
    ...rest
  }: Props = $props();

  const uid = $props.id();
  const shown = $derived(shownTab(tabs, selected));
  const buttons: HTMLButtonElement[] = $state([]);

  function select(id: string): void {
    if (id === shown) return;
    selected = id;
    onselect?.(id);
  }

  function keydown(event: KeyboardEvent): void {
    const move = tabMove(event.key);
    if (move === undefined) return;
    const current = tabs.findIndex((tab) => tab.id === shown);
    const target = landOn(
      move,
      current,
      tabs.map((tab) => tab.disabled !== true),
    );
    const tab = target === undefined ? undefined : tabs[target];
    if (target === undefined || tab === undefined) return;
    event.preventDefault();
    select(tab.id);
    buttons[target]?.focus();
  }
</script>

<div {...rest} class={['tabs', TABS_VARIANTS[variant], className]}>
  <div class="tab-list" role="tablist" aria-label={label}>
    {#each tabs as tab, index (tab.id)}
      <button
        bind:this={buttons[index]}
        type="button"
        role="tab"
        id="{uid}-tab-{index}"
        aria-controls="{uid}-panel-{index}"
        aria-selected={tab.id === shown}
        tabindex={tab.id === shown ? 0 : -1}
        disabled={tab.disabled === true}
        class={['tab', { 'is-active': tab.id === shown }]}
        onclick={() => select(tab.id)}
        onkeydown={keydown}>{tab.label}</button
      >
    {/each}
  </div>
  {#each tabs as tab, index (tab.id)}
    <div
      class="tab-panel"
      role="tabpanel"
      id="{uid}-panel-{index}"
      aria-labelledby="{uid}-tab-{index}"
      tabindex="0"
      hidden={tab.id !== shown}
    >
      {#if tab.id === shown}
        {@render panel(tab)}
      {/if}
    </div>
  {/each}
</div>
