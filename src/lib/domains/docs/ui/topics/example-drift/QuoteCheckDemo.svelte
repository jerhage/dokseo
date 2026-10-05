<script lang="ts">
  import Alert from '$lib/ui/components/Alert.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Field from '$lib/ui/components/Field.svelte';
  import SegmentedControl from '$lib/ui/components/SegmentedControl.svelte';
  import Textarea from '$lib/ui/components/Textarea.svelte';
  import { editedQuote } from '../../../domain/quote-drift';
  import DocsDemo from '../../DocsDemo.svelte';
  import {
    DEMO_QUOTES,
    EDIT_OPTIONS,
    checkSummary,
    demoQuote,
    quoteCheck,
    quoteEdit,
  } from './quote-check';
  import type { DemoQuoteId, EditId } from './quote-check';

  const QUOTE_OPTIONS = DEMO_QUOTES.map((quote) => ({ value: quote.id, label: quote.title }));

  let quoteId = $state<DemoQuoteId>('ja-ocr-text');
  let text = $state(demoQuote('ja-ocr-text').snippet.code);

  const snippet = $derived(demoQuote(quoteId).snippet);
  const summary = $derived(checkSummary(quoteCheck(snippet.file, text), snippet.file));

  function chooseQuote(id: DemoQuoteId): void {
    quoteId = id;
    text = demoQuote(id).snippet.code;
  }

  function applyEdit(id: EditId): void {
    text = editedQuote(snippet.code, quoteEdit(id));
  }
</script>

<DocsDemo label="The drift check on a real quote">
  <div class="stack-md">
    <SegmentedControl
      label="Quote"
      variant="track"
      options={QUOTE_OPTIONS}
      value={quoteId}
      onvaluechange={chooseQuote}
    />
    <p class="m-0 text-sm text-muted">Source file: <code>{snippet.file}</code></p>
    <div class="row wrap gap-2">
      {#each EDIT_OPTIONS as option (option.id)}
        <Button size="sm" variant="outline" onclick={() => applyEdit(option.id)}>
          {option.label}
        </Button>
      {/each}
    </div>
    <Field label="The quote, editable">
      {#snippet children(control)}
        <Textarea {...control} class="mono text-xs" rows={8} spellcheck="false" bind:value={text} />
      {/snippet}
    </Field>
    <div aria-live="polite">
      <Alert variant={summary.variant} title={summary.title}>{summary.text}</Alert>
    </div>
  </div>
  {#snippet caption()}
    The check runs <code>unindented</code> on both sides and looks for the quote in the file's text
    as it is in this checkout, loaded through Vite's <code>?raw</code> import. A spec checks that the
    demo loads the same text the drift spec reads from disk.
  {/snippet}
</DocsDemo>
