<script lang="ts">
  import type { Snippet } from 'svelte';
  import BreakpointProbe from '$lib/components/BreakpointProbe.svelte';
  import ChromeBar from '$lib/components/ChromeBar.svelte';
  import Dock from '$lib/components/Dock.svelte';
  import ToastClearance from '$lib/components/ToastClearance.svelte';
  import type { ReaderFrameView } from './reader-frame.svelte';

  type Props = {
    readonly frame: ReaderFrameView;
    readonly shown: boolean;
    readonly class: string;
    readonly pageClass: string;
    readonly notice?: Snippet;
    readonly page: Snippet;
    readonly header: Snippet;
    readonly footer: Snippet;
    readonly overlay?: Snippet;
    readonly panel?: Snippet | undefined;
    readonly panelCount?: number | undefined;
  };

  let {
    frame,
    shown,
    class: className,
    pageClass,
    notice,
    page,
    header,
    footer,
    overlay,
    panel,
    panelCount,
  }: Props = $props();

  $effect(() => {
    function refresh(): void {
      frame.focus.refresh();
    }

    window.addEventListener('focusin', refresh);
    window.addEventListener('focusout', refresh);
    window.addEventListener('toggle', refresh, true);

    return () => {
      window.removeEventListener('focusin', refresh);
      window.removeEventListener('focusout', refresh);
      window.removeEventListener('toggle', refresh, true);
    };
  });
</script>

<div class={[className, 'col gap-0 h-screen overflow-hidden surface-bg']}>
  {@render notice?.()}

  <div
    class={['relative gap-0 flex-1 min-h-0 overflow-hidden', frame.narrow ? 'col' : 'row']}
    bind:clientWidth={frame.bodyWidth}
    bind:clientHeight={frame.bodyHeight}
  >
    <BreakpointProbe breakpoint="--breakpoint-compact" bind:width={frame.compactWidth} />

    <div
      class={['relative flex-1 min-h-0 overflow-hidden', pageClass]}
      bind:clientHeight={frame.pageHeight}
      style:--pin-drop="{shown ? frame.topHeight : 0}px"
      style:--pin-lift="{shown ? frame.bottomHeight : 0}px"
    >
      {@render page()}

      <ChromeBar edge="top" {shown} bind:ref={frame.topBar} bind:height={frame.topHeight}>
        {@render header()}
      </ChromeBar>

      <ChromeBar edge="bottom" {shown} bind:ref={frame.bottomBar} bind:height={frame.bottomHeight}>
        {@render footer()}
      </ChromeBar>

      {@render overlay?.()}
    </div>

    {#if panel !== undefined}
      <Dock
        placement={frame.placement}
        count={panelCount}
        label="Captures"
        expandLabel="Show captures"
        collapseLabel="Hide captures"
        ontoggle={() => frame.togglePanel()}
      >
        {@render panel()}
      </Dock>
    {/if}
  </div>
</div>

<ToastClearance blockEnd={frame.toastClearance(shown)} />
