<script lang="ts">
  import type { Snippet } from 'svelte';
  import { match } from 'ts-pattern';
  import Alert from '$lib/components/Alert.svelte';
  import Button from '$lib/components/Button.svelte';
  import Progress from '$lib/components/Progress.svelte';
  import Radio from '$lib/components/Radio.svelte';
  import { lockScrolling } from '$lib/platform/dom/scroll-lock';
  import type { Arrangement } from '$lib/shared/arrangement';
  import type { ImageIndex } from '$lib/shared/ids';
  import type { GlowRegion, ImageRegion } from '$lib/shared/image-region';
  import { languageName } from '$lib/shared/language';
  import {
    LAYOUT_KIND_CHOICES,
    LAYOUT_KIND_LEGEND_BRIEF,
    PAGE_PAIRING_CHOICES,
    PAGE_PAIRING_LEGEND_BRIEF,
    READING_DIRECTION_CHOICES,
    READING_DIRECTION_LEGEND_BRIEF,
  } from '$lib/shared/layout-choices';
  import ReaderBars from '$lib/shared/ReaderBars.svelte';
  import { dragOrigin, NOTE_GLYPH, NOTE_MODE_LABEL } from '../../drag-mode';
  import { FLOWING_TEXT_NOTICE } from '../../flow-notice';
  import { handlesOwnKeys } from '../../keyboard';
  import { moveOrder } from '../../page-moves';
  import type { PageMove } from '../../page-moves';
  import type { ReaderView } from '../../reader-view.svelte';
  import ContinuousViewer from './ContinuousViewer.svelte';
  import PagedViewer from './PagedViewer.svelte';
  import './reader-screen.css';

  type ScreenFill = 'screen' | 'parent';

  type Props = {
    readonly view: ReaderView;
    readonly fill?: ScreenFill;
    readonly glow?: readonly GlowRegion[];
    readonly panel?: Snippet;
    readonly engine?: Snippet;
    readonly arrival?: Snippet;
    readonly onSelect?: (regions: readonly ImageRegion[], arrangement: Arrangement) => void;
    readonly onNote?: (regions: readonly ImageRegion[]) => void;
  };

  type Turn = {
    readonly label: string;
    readonly enabled: boolean;
    readonly go: () => void;
  };

  type FitChoice = {
    readonly label: string;
    readonly ready: boolean;
    readonly active: boolean;
    readonly go: () => void;
  };

  type Place = {
    readonly marker: string;
    readonly of: number;
    readonly at: number;
  };

  let {
    view,
    fill = 'screen',
    glow = [],
    panel,
    engine,
    arrival,
    onSelect,
    onNote,
  }: Props = $props();

  const uid = $props.id();

  const SIDEWAYS: readonly string[] = ['‹', '›'];
  const DOWNWARDS: readonly string[] = ['↑', '↓'];

  let paged = $state<ReturnType<typeof PagedViewer> | null>(null);
  let strip = $state<ReturnType<typeof ContinuousViewer> | null>(null);
  let bars = $state<ReturnType<typeof ReaderBars> | null>(null);
  let noting = $state(false);

  const makes = $derived(dragOrigin(noting));

  const barsShown = $derived(bars?.shown() ?? false);

  function toggleBars(): void {
    bars?.toggle();
  }

  const book = $derived(view.book);
  const total = $derived(book?.imageCount ?? 0);
  const rtl = $derived(view.direction === 'rtl');
  const groupCount = $derived(view.groups.length);
  const group = $derived(view.group);
  const renderer = $derived.by(() => {
    const kind = view.layout;
    if (kind === null) return null;

    return match(kind)
      .with('paged', () => 'paged' as const)
      .with('continuous', () => 'strip' as const)
      .exhaustive();
  });
  const downward = $derived(renderer === 'strip');
  const layout = $derived(view.layout);
  const pairing = $derived(book?.pagePairing ?? null);
  const direction = $derived(book?.direction ?? null);

  const stage = $derived(
    match(view.status)
      .with('idle', () => 'settling' as const)
      .with('loading', () => 'settling' as const)
      .with('missing', () => 'settling' as const)
      .with('ready', () => 'reading' as const)
      .with('empty', () => 'empty' as const)
      .with('failed', () => 'failed' as const)
      .with('flow', () => 'flowing' as const)
      .exhaustive(),
  );

  const curtain = $derived(
    match(stage)
      .with('settling', () => 'Opening the book…')
      .with('reading', () => null)
      .with('empty', () => 'This book holds no pages to show.')
      .with('failed', () => view.message ?? 'This book could not be opened.')
      .with('flowing', () => FLOWING_TEXT_NOTICE)
      .exhaustive(),
  );

  const meta = $derived(book === null ? '' : `${total} images · ${languageName(book.language)}`);

  function commit(regions: readonly ImageRegion[], arrangement: Arrangement): void {
    view.select(regions);
    if (makes === 'written') onNote?.(regions);
    else onSelect?.(regions, arrangement);
  }

  function page(index: ImageIndex): string {
    return String(index + 1).padStart(3, '0');
  }

  const canPrevious = $derived(stage === 'reading' && group > 0);
  const canNext = $derived(stage === 'reading' && group + 1 < groupCount);

  const forwardKey = $derived(rtl ? 'ArrowLeft' : 'ArrowRight');

  const place = $derived.by<Place>(() => {
    const kind = view.layout;
    if (kind === null) return { marker: `— / ${total}`, of: 0, at: 0 };

    return match(kind)
      .with('paged', () => ({
        marker:
          view.visiblePages.length === 0
            ? `— / ${total}`
            : `${view.visiblePages.map(page).join('–')} / ${total}`,
        of: groupCount,
        at: groupCount === 0 ? 0 : group + 1,
      }))
      .with('continuous', () => ({
        marker: total === 0 ? `— / ${total}` : `${page(view.position.index)} / ${total}`,
        of: total,
        at: total === 0 ? 0 : view.position.index + 1,
      }))
      .exhaustive();
  });

  const turns = $derived.by<Record<PageMove, Turn> | null>(() => {
    const kind = view.layout;
    if (kind === null) return null;

    return match(kind)
      .with('paged', () => ({
        decrement: {
          label: 'Previous page',
          enabled: canPrevious,
          go: () => void view.previous(),
        },
        increment: { label: 'Next page', enabled: canNext, go: () => void view.next() },
      }))
      .with('continuous', () => ({
        decrement: {
          label: 'Previous screen',
          enabled: stage === 'reading' && (strip?.canShift(-1) ?? false),
          go: () => strip?.shift(-1),
        },
        increment: {
          label: 'Next screen',
          enabled: stage === 'reading' && (strip?.canShift(1) ?? false),
          go: () => strip?.shift(1),
        },
      }))
      .exhaustive();
  });

  const order = $derived.by<readonly PageMove[]>(() => {
    const kind = view.layout;
    if (kind === null) return [];

    return moveOrder(kind, view.direction);
  });

  const glyphs = $derived(downward ? DOWNWARDS : SIDEWAYS);

  const caption = 'mono text-xs uppercase tracking-wide text-faint p-0';

  const fits = $derived.by<readonly FitChoice[]>(() => {
    const kind = view.layout;
    if (kind === null) return [];

    return match(kind)
      .with('paged', () => [
        {
          label: 'Fit height',
          ready: paged !== null,
          active: paged?.activeFit() === 'height',
          go: () => paged?.fitHeight(),
        },
        {
          label: 'Fit width',
          ready: paged !== null,
          active: paged?.activeFit() === 'width',
          go: () => paged?.fitWidth(),
        },
      ])
      .with('continuous', () => [
        {
          label: 'Fit width',
          ready: strip !== null,
          active: strip?.atFitWidth() ?? false,
          go: () => strip?.fitWidth(),
        },
      ])
      .exhaustive();
  });

  $effect(() => lockScrolling(document.documentElement));

  function onkeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (downward) return;
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    if (handlesOwnKeys(event.target)) return;

    event.preventDefault();
    if (event.key === forwardKey) void view.next();
    else void view.previous();
  }
</script>

<svelte:window {onkeydown} />

<div
  class={[
    'reader-screen col gap-0 overflow-hidden surface-bg',
    fill === 'screen' ? 'h-screen' : 'flex-1 min-h-0',
  ]}
>
  <ReaderBars bind:this={bars} placement="stacked" startShown={false} scheme="page">
    {#snippet header()}
      <div class="row wrap items-center gap-4 flex-1">
        <div class="col gap-1 flex-1">
          <h1 class="text-base weight-normal truncate" lang={book?.language ?? 'en'}>
            {book?.title ?? 'Reader'}
          </h1>
          <p class="text-xs text-faint">{meta}</p>
        </div>

        {#if book !== null}
          <div class="row wrap items-start gap-4">
            <fieldset class="fieldset gap-1" disabled={view.saving}>
              <legend class={caption}>{LAYOUT_KIND_LEGEND_BRIEF}</legend>
              <div class="row wrap gap-3">
                {#each LAYOUT_KIND_CHOICES as choice (choice.value)}
                  <Radio
                    name="{uid}-layout"
                    value={choice.value}
                    group={layout}
                    title={choice.label}
                    onchange={() => void view.setLayoutKind(choice.value)}>{choice.brief}</Radio
                  >
                {/each}
              </div>
            </fieldset>

            {#if engine !== undefined}
              <fieldset class="fieldset gap-1">
                <legend class={caption}>Engine</legend>
                {@render engine()}
              </fieldset>
            {/if}

            <fieldset class="fieldset gap-1" disabled={view.saving || downward}>
              <legend class={caption}>{PAGE_PAIRING_LEGEND_BRIEF}</legend>
              <div class="row wrap gap-3">
                {#each PAGE_PAIRING_CHOICES as choice (choice.value)}
                  <Radio
                    name="{uid}-pairing"
                    value={choice.value}
                    group={pairing}
                    title={choice.label}
                    onchange={() => void view.setPairing(choice.value)}>{choice.brief}</Radio
                  >
                {/each}
              </div>
            </fieldset>

            <fieldset class="fieldset gap-1" disabled={view.saving || downward}>
              <legend class={caption}>{READING_DIRECTION_LEGEND_BRIEF}</legend>
              <div class="row wrap gap-3">
                {#each READING_DIRECTION_CHOICES as choice (choice.value)}
                  <Radio
                    name="{uid}-direction"
                    value={choice.value}
                    group={direction}
                    title={choice.label}
                    onchange={() => void view.setDirection(choice.value)}>{choice.brief}</Radio
                  >
                {/each}
              </div>
            </fieldset>

            <div class="fieldset gap-1" role="group" aria-labelledby="{uid}-fit">
              <span class={caption} id="{uid}-fit">Fit</span>
              <div class="row wrap gap-1">
                {#each fits as choice (choice.label)}
                  <Button
                    size="sm"
                    disabled={!choice.ready}
                    active={choice.active}
                    aria-pressed={choice.active}
                    onclick={choice.go}
                  >
                    {choice.label}
                  </Button>
                {/each}
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/snippet}

    {#snippet between()}
      {#if view.message !== null && stage === 'reading'}
        <Alert variant="warning" role="alert" class="shrink-0">{view.message}</Alert>
      {/if}

      <div class="relative row gap-0 flex-1 min-h-0">
        {#if curtain === null && book !== null && renderer === 'strip'}
          <ContinuousViewer
            bind:this={strip}
            sizes={view.sizes}
            start={view.position}
            pictureAt={(index) => view.pictureAt(index)}
            measured={(index, size) => view.measure(index, size)}
            {glow}
            {makes}
            moveTo={(position) => view.moveTo(position)}
            select={(regions) => commit(regions, 'column')}
            clear={() => view.clearSelection()}
            onTap={toggleBars}
          />
        {:else if curtain === null && book !== null}
          {#key book.id}
            <PagedViewer
              bind:this={paged}
              pages={view.visiblePages}
              direction={book.direction}
              pageFit={book.pageFit}
              pictureAt={(index) => view.pictureAt(index)}
              measured={(index, size) => view.measure(index, size)}
              {glow}
              {makes}
              chromeShown={barsShown}
              select={(regions) => commit(regions, 'row')}
              clear={() => view.clearSelection()}
              onTap={toggleBars}
              onFit={(fit) => void view.setPageFit(fit)}
            />
          {/key}
        {:else}
          <div
            class="col items-center justify-center gap-3 flex-1 min-h-0 p-5 scheme-dark surface-sunken"
          >
            <p class="prose text-sm text-muted" aria-live="polite">{curtain}</p>
            {#if stage === 'failed'}
              <Button href="/" variant="primary" size="sm">Back to your library</Button>
            {/if}
          </div>
        {/if}

        {#if barsShown}
          <div
            class="rail col gap-1 p-1 surface bordered rounded-full shadow-sm"
            role="group"
            aria-label="Reader controls"
          >
            <Button href="/" variant="ghost" size="sm" square pill>
              <span aria-hidden="true">⌂</span>
              <span class="visually-hidden">Back to your library</span>
            </Button>

            {#if turns !== null}
              <span class="divider my-1"></span>

              {#each order as move, slot (move)}
                {@const turn = turns[move]}
                <Button
                  variant="ghost"
                  size="sm"
                  square
                  pill
                  disabled={!turn.enabled}
                  onclick={turn.go}
                >
                  <span aria-hidden="true">{glyphs[slot]}</span>
                  <span class="visually-hidden">{turn.label}</span>
                </Button>
              {/each}

              <span class="divider my-1"></span>

              <Button
                variant={noting ? 'accent' : 'ghost'}
                size="sm"
                square
                pill
                aria-pressed={noting}
                title={NOTE_MODE_LABEL}
                onclick={() => (noting = !noting)}
              >
                <span aria-hidden="true">{NOTE_GLYPH}</span>
                <span class="visually-hidden">{NOTE_MODE_LABEL}</span>
              </Button>
            {/if}
          </div>
        {/if}

        {#if arrival !== undefined}
          <div class="arrived">{@render arrival()}</div>
        {/if}

        {#if panel !== undefined}
          <aside class="dock row gap-0 shrink-0 min-h-0 border-s scheme-dark surface">
            {@render panel()}
          </aside>
        {/if}
      </div>
    {/snippet}

    {#snippet footer()}
      <p class="mono text-xs text-muted shrink-0">{place.marker}</p>

      <Progress
        class="flex-1"
        size="sm"
        label="Reading progress"
        value={place.at}
        max={place.of}
        aria-valuetext={place.marker}
        dir={rtl ? 'rtl' : 'ltr'}
      />
    {/snippet}
  </ReaderBars>
</div>
