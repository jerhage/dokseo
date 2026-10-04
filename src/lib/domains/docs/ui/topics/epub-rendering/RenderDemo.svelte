<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Field from '$lib/components/Field.svelte';
  import SegmentedControl from '$lib/components/SegmentedControl.svelte';
  import Select from '$lib/components/Select.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import {
    DEFAULT_READING_SETTINGS,
    TEXT_SIZE_CHOICES,
    TEXT_SIZE_LEGEND,
    withPhoneticReadings,
    withTextSize,
  } from '$lib/domains/flowing/domain/reading-settings';
  import type { ReadingSettings } from '$lib/domains/flowing/domain/reading-settings';
  import { cfiPartMeaning, readCfi } from '../../../domain/cfi-reading';
  import type { SampleBook, SampleWritingMode } from '../../../domain/sample-epub';
  import DocsDemo from '../../DocsDemo.svelte';
  import { BookStage, pagingLabel } from './book-stage.svelte';
  import type { FlowKit } from './flow-kit';
  import SampleBookStage from './SampleBookStage.svelte';

  type Props = {
    kit: FlowKit;
  };

  let { kit }: Props = $props();

  const MODES: readonly { value: SampleWritingMode; label: string }[] = [
    { value: 'vertical', label: 'Vertical' },
    { value: 'horizontal', label: 'Horizontal' },
  ];

  const stage = new BookStage((host, opening, bind) => kit.open(host, opening, bind));

  let book = $state.raw<SampleBook>({ writingMode: 'vertical', edition: 'first' });
  let settings = $state.raw<ReadingSettings>(DEFAULT_READING_SETTINGS);
  let frameWidth = $state<number | null>(null);

  const cfi = $derived(stage.location?.cfi ?? null);
  const parts = $derived(cfi === null ? [] : (readCfi(cfi) ?? []));
  const paging = $derived(stage.state.kind === 'open' ? pagingLabel(stage.state.paging) : null);

  function chooseMode(writingMode: SampleWritingMode): void {
    book = { ...book, writingMode };
    frameWidth = null;
    void stage.show(book, settings);
  }

  function restyle(next: ReadingSettings): void {
    settings = next;
    stage.restyle(next);
  }

  function chooseSize(value: string): void {
    const choice = TEXT_SIZE_CHOICES.find((candidate) => candidate.value === value);
    if (choice !== undefined) restyle(withTextSize(settings, choice.value));
  }

  function turn(step: 'prev' | 'next'): void {
    const pages = stage.surface?.pages;
    if (pages === undefined) return;
    if (step === 'prev') void pages.prev();
    else void pages.next();
  }

  function measureFrame(): void {
    frameWidth = stage.chapter?.doc.defaultView?.innerWidth ?? null;
  }
</script>

<DocsDemo label="The sample book in Dokseo's renderer">
  {#snippet caption()}
    A three-chapter EPUB built in this page from strings, opened with
    <code>openFlowSurface</code>, the function the reader itself calls. The controls call the same
    style function the reader's text settings call. Nothing is saved.
  {/snippet}
  <div class="stack-md">
    <div class="row wrap items-end gap-4">
      <SegmentedControl
        label="Writing mode"
        options={MODES}
        value={book.writingMode}
        onvaluechange={chooseMode}
      />
      <Field label={TEXT_SIZE_LEGEND}>
        {#snippet children(control)}
          <Select
            {...control}
            value={settings.textSize}
            onchange={(event) => chooseSize(event.currentTarget.value)}
          >
            {#each TEXT_SIZE_CHOICES as choice (choice.value)}
              <option value={choice.value}>{choice.label}</option>
            {/each}
          </Select>
        {/snippet}
      </Field>
      <Toggle
        checked={settings.showPhoneticReadings}
        onchange={(event) => restyle(withPhoneticReadings(settings, event.currentTarget.checked))}
        >Furigana</Toggle
      >
    </div>
    <SampleBookStage
      {stage}
      {book}
      {settings}
      ink={kit.ink}
      label="The sample book, rendered by foliate-js"
    />
    <div class="row wrap items-center gap-2">
      <Button size="sm" onclick={() => turn('prev')}>Previous page</Button>
      <Button size="sm" onclick={() => turn('next')}>Next page</Button>
      <Button size="sm" variant="ghost" onclick={measureFrame}>Measure the chapter frame</Button>
    </div>
    <dl class="stack-sm text-sm">
      <div>
        <dt class="text-muted">Paging</dt>
        <dd class="m-0">{paging ?? '…'}</dd>
      </div>
      {#if frameWidth !== null}
        <div>
          <dt class="text-muted">Chapter frame width, from inside the frame</dt>
          <dd class="m-0">{frameWidth} px</dd>
        </div>
      {/if}
      <div>
        <dt class="text-muted">Location, as the reader saves it</dt>
        <dd class="m-0 wrap-anywhere"><code>{cfi ?? '…'}</code></dd>
      </div>
    </dl>
    {#if parts.length > 0}
      <ol class="list-reset stack-sm text-sm" aria-label="The location, step by step">
        {#each parts as part, index (index)}
          <li class="row wrap gap-2">
            <code>{part.text}</code>
            <span class="text-muted">{cfiPartMeaning(part)}</span>
          </li>
        {/each}
      </ol>
    {/if}
  </div>
</DocsDemo>
