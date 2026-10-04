<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Field from '$lib/components/Field.svelte';
  import Highlight from '$lib/components/Highlight.svelte';
  import Input from '$lib/components/Input.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import { searchFold } from './dokseo-text';

  type Case = { readonly label: string; readonly text: string; readonly query: string };

  const CASES: readonly Case[] = [
    { label: 'Katakana query, hiragana text', text: 'ねこがすき', query: 'ネコ' },
    { label: 'Full-width query, half-width text', text: 'ｶﾞｲﾄﾞﾌﾞｯｸ', query: 'ガイド' },
    { label: 'Spacing voiced mark', text: 'か゛っこいい', query: 'がっこ' },
    { label: 'Full-width Latin', text: 'ＯＣＲで読む', query: 'ocr' },
    { label: 'A square word', text: '５㌔走る', query: 'キロ' },
    { label: 'Decomposed title', text: 'がくえん 1', query: 'がくえん' },
  ];

  let text = $state('ｶﾞｲﾄﾞﾌﾞｯｸ');
  let query = $state('ガイド');

  const fold = $derived(searchFold(text, query));

  function choose(one: Case): void {
    text = one.text;
    query = one.query;
  }
</script>

<DocsDemo label="Dokseo's search fold">
  {#snippet caption()}
    The real <code>foldForSearch</code> and <code>textMatches</code> from
    <code>shared/text-search.ts</code>. The highlight is drawn on the original text, from the
    offsets the fold keeps.
  {/snippet}
  <div class="stack-md">
    <div class="row wrap gap-2">
      {#each CASES as one (one.label)}
        <Button size="sm" variant="outline" onclick={() => choose(one)}>{one.label}</Button>
      {/each}
    </div>
    <div class="grid-2 gap-2">
      <Field label="Text">
        {#snippet children(control)}
          <Input {...control} bind:value={text} lang="ja" />
        {/snippet}
      </Field>
      <Field label="Search">
        {#snippet children(control)}
          <Input {...control} bind:value={query} lang="ja" />
        {/snippet}
      </Field>
    </div>
    <dl class="grid-2 gap-2 m-0 text-sm">
      <div>
        <dt class="text-muted">Folded text</dt>
        <dd class="m-0 text-lg" lang="ja">{fold.foldedText}</dd>
      </div>
      <div>
        <dt class="text-muted">Folded search</dt>
        <dd class="m-0 text-lg" lang="ja">{fold.foldedQuery}</dd>
      </div>
    </dl>
    <p class="m-0 row wrap items-center gap-2">
      {#if fold.found}
        <Badge variant="success">found</Badge>
      {:else}
        <Badge>not found</Badge>
      {/if}
      <span class="text-lg" lang="ja"><Highlight segments={fold.segments} /></span>
    </p>
  </div>
</DocsDemo>
