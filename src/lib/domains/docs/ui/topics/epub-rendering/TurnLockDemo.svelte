<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import { DEFAULT_READING_SETTINGS } from '$lib/domains/flowing/domain/reading-settings';
  import type { SampleBook } from '../../../domain/sample-epub';
  import DocsDemo from '../../DocsDemo.svelte';
  import { BookStage } from './book-stage.svelte';
  import type { FlowKit } from './flow-kit';
  import SampleBookStage from './SampleBookStage.svelte';
  import { burstSummary, TEN_PRESSES, TurnBurst } from './turn-burst.svelte';

  type Props = {
    kit: FlowKit;
  };

  let { kit }: Props = $props();

  const BOOK: SampleBook = { writingMode: 'horizontal', edition: 'first' };

  const SECOND_CHAPTER = 'OEBPS/ch2.xhtml';

  const burst = new TurnBurst();
  let backOneAfterTheJump = false;
  const stage = new BookStage((host, opening, bind) => kit.open(host, opening, bind), {
    moved: (at) => {
      burst.moved(at);
      if (!backOneAfterTheJump || at.cause.kind !== 'travel') return;
      backOneAfterTheJump = false;
      void stage.surface?.pages.prev();
    },
  });

  const summary = $derived(burstSummary(burst.state));

  function press(): void {
    void stage.surface?.pages.next();
  }

  function toChapterStart(): void {
    stage.surface?.jump(SECOND_CHAPTER);
  }

  function toLastPageOfChapterOne(): void {
    backOneAfterTheJump = true;
    stage.surface?.jump(SECOND_CHAPTER);
  }
</script>

<DocsDemo label="Ten presses of Next, 40 ms apart">
  {#snippet caption()}
    Each press calls <code>next()</code> on foliate-js, as a tap on the page edge does. The spine position
    after each turn comes from the CFI of that relocation.
  {/snippet}
  <div class="stack-md">
    <SampleBookStage
      {stage}
      book={BOOK}
      settings={DEFAULT_READING_SETTINGS}
      ink={kit.ink}
      label="The sample book, for the turn lock"
    />
    <div class="row wrap items-center gap-2">
      <Button size="sm" variant="ghost" onclick={toChapterStart}>Start of chapter 2</Button>
      <Button size="sm" variant="ghost" onclick={toLastPageOfChapterOne}
        >Last page of chapter 1</Button
      >
      <Button
        size="sm"
        variant="primary"
        disabled={burst.running}
        onclick={() => void burst.run(press, TEN_PRESSES)}>Press Next ten times</Button
      >
    </div>
    <p class="text-sm m-0" aria-live="polite">{summary}</p>
  </div>
</DocsDemo>
