<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Field from '$lib/components/Field.svelte';
  import Input from '$lib/components/Input.svelte';
  import SegmentedControl from '$lib/components/SegmentedControl.svelte';
  import { segmentedText, spaceSplit } from '../../../domain/unicode-text';
  import type { WordGranularity } from '../../../domain/unicode-text';
  import DocsDemo from '../../DocsDemo.svelte';

  const GRANULARITIES = [
    { value: 'word', label: 'word' },
    { value: 'grapheme', label: 'grapheme' },
    { value: 'sentence', label: 'sentence' },
  ] as const;

  const SAMPLES: readonly string[] = [
    '吾輩は猫である。名前はまだ無い。',
    '私は東京に住んでいます。',
    'すもももももももものうち',
    'コンピューターを使う',
    'I live in Tokyo.',
  ];

  let text = $state('吾輩は猫である。名前はまだ無い。');
  let granularity = $state<WordGranularity>('word');

  const segments = $derived(segmentedText(text, granularity));
  const words = $derived(segments.filter((one) => one.wordLike).length);
  const parts = $derived(spaceSplit(text));
</script>

<DocsDemo label="Words in a sentence with no spaces">
  {#snippet caption()}
    <code>new Intl.Segmenter('ja', {'{'} granularity {'}'})</code> in this browser. A solid badge is
    a segment with <code>isWordLike</code> set; punctuation and spaces are quiet.
  {/snippet}
  <div class="stack-md">
    <div class="row wrap gap-2">
      {#each SAMPLES as sample (sample)}
        <Button size="sm" variant="outline" onclick={() => (text = sample)}
          ><span lang="ja">{sample}</span></Button
        >
      {/each}
    </div>
    <Field label="Text">
      {#snippet children(control)}
        <Input {...control} bind:value={text} lang="ja" />
      {/snippet}
    </Field>
    <SegmentedControl label="Granularity" options={GRANULARITIES} bind:value={granularity} />
    <p class="m-0 row wrap gap-1" lang="ja">
      {#each segments as one (one.index)}
        <Badge
          variant={one.wordLike ? 'primary' : 'neutral'}
          emphasis={one.wordLike ? 'solid' : 'quiet'}>{one.segment}</Badge
        >
      {/each}
    </p>
    <p class="m-0 text-sm text-muted">
      {segments.length} segments{granularity === 'word' ? `, ${words} of them word-like` : ''}.
      <code>text.split(' ')</code> gives {parts.length}
      {parts.length === 1 ? 'part' : 'parts'}.
    </p>
  </div>
</DocsDemo>
