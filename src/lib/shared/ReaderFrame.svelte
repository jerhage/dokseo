<script lang="ts">
  import type { Snippet } from 'svelte';
  import BreakpointProbe from '$lib/ui/components/BreakpointProbe.svelte';
  import ChromeBar from '$lib/ui/components/ChromeBar.svelte';
  import Dock from '$lib/ui/components/Dock.svelte';
  import ToastClearance from '$lib/ui/components/ToastClearance.svelte';
  import { isNarrow } from './panel-dock';
  import { dockState, pinLift, toastClearance } from './reader-frame-rules';
  import type { PanelDockHook } from './reader-frame.svelte';

  type Props = {
    readonly dock: PanelDockHook;
    readonly shown: boolean;
    readonly class: string;
    readonly pageClass: string;
    readonly onfocuschange?: (() => void) | undefined;
    readonly onmeasure?: ((bodyWidth: number, compactWidth: number) => void) | undefined;
    readonly notice?: Snippet;
    readonly page: Snippet;
    readonly header: Snippet;
    readonly footer: Snippet;
    readonly overlay?: Snippet;
    readonly panel?: Snippet<[boolean]> | undefined;
    readonly panelCount?: number | undefined;
    bodyWidth?: number;
    compactWidth?: number;
    topBar?: HTMLElement | null | undefined;
    bottomBar?: HTMLElement | null | undefined;
  };

  let {
    dock,
    shown,
    class: className,
    pageClass,
    onfocuschange,
    onmeasure,
    notice,
    page,
    header,
    footer,
    overlay,
    panel,
    panelCount,
    bodyWidth = $bindable(0),
    compactWidth = $bindable(0),
    topBar = $bindable(),
    bottomBar = $bindable(),
  }: Props = $props();

  let bodyHeight = $state(0);
  let pageHeight = $state(0);
  let topHeight = $state(0);
  let bottomHeight = $state(0);
  let sheetCover = $state(0);

  let probe = $state<HTMLDivElement | null>(null);

  function watchWidths(body: HTMLElement, measured: HTMLDivElement | null): () => void {
    const observer = new ResizeObserver(() =>
      onmeasure?.(body.clientWidth, measured?.clientWidth ?? 0),
    );
    observer.observe(body);
    if (measured !== null) observer.observe(measured);
    return () => observer.disconnect();
  }

  const narrow = $derived(isNarrow(bodyWidth, compactWidth));
  const docked = $derived(dockState(narrow, dock.asked));
  const lift = $derived(pinLift(shown, { bottomHeight, sheetCover }));
  const clearance = $derived(
    toastClearance(shown, { bodyHeight, pageHeight, bottomHeight, sheetCover }),
  );
</script>

<svelte:window
  onfocusin={() => onfocuschange?.()}
  onfocusout={() => onfocuschange?.()}
  ontogglecapture={() => onfocuschange?.()}
/>

<div class={[className, 'col gap-0 h-screen overflow-hidden surface-bg']}>
  {@render notice?.()}

  <div
    class={['relative gap-0 flex-1 min-h-0 overflow-hidden', narrow ? 'col' : 'row']}
    bind:clientWidth={bodyWidth}
    bind:clientHeight={bodyHeight}
    {@attach (body) => watchWidths(body, probe)}
  >
    <BreakpointProbe breakpoint="--breakpoint-compact" bind:width={compactWidth} bind:ref={probe} />

    <div
      class={['relative flex-1 min-h-0 overflow-hidden', pageClass]}
      bind:clientHeight={pageHeight}
      style:--pin-drop="{shown ? topHeight : 0}px"
      style:--pin-lift="{lift}px"
      style:--chrome-bar-lift="{sheetCover}px"
    >
      {@render page()}

      <ChromeBar edge="top" {shown} bind:ref={topBar} bind:height={topHeight}>
        {@render header()}
      </ChromeBar>

      <ChromeBar edge="bottom" {shown} bind:ref={bottomBar} bind:height={bottomHeight}>
        {@render footer()}
      </ChromeBar>

      {@render overlay?.()}
    </div>

    {#if panel !== undefined}
      <Dock
        placement={docked.placement}
        count={panelCount}
        label="Captures"
        expandLabel="Show captures"
        collapseLabel="Hide captures"
        resizeLabel="Resize captures"
        ontoggle={() => dock.toggle(narrow)}
        bind:cover={sheetCover}
      >
        {@render panel(docked.open)}
      </Dock>
    {/if}
  </div>
</div>

<ToastClearance blockEnd={clearance} />
