<script lang="ts">
  import SegmentedControl from '$lib/ui/components/SegmentedControl.svelte';
  import Toggle from '$lib/ui/components/Toggle.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import './unicode.css';

  type Mode = 'horizontal-tb' | 'vertical-rl' | 'vertical-lr';

  type Orientation = 'mixed' | 'upright' | 'sideways';

  const MODES = [
    { value: 'horizontal-tb', label: 'horizontal-tb' },
    { value: 'vertical-rl', label: 'vertical-rl' },
    { value: 'vertical-lr', label: 'vertical-lr' },
  ] as const;

  const ORIENTATIONS = [
    { value: 'mixed', label: 'mixed' },
    { value: 'upright', label: 'upright' },
    { value: 'sideways', label: 'sideways' },
  ] as const;

  let mode = $state<Mode>('vertical-rl');
  let orientation = $state<Orientation>('mixed');
  let combined = $state(true);
  let readings = $state(true);
</script>

<DocsDemo label="Vertical writing playground">
  {#snippet caption()}
    The text is ordinary HTML with <code>ruby</code> elements, styled by this browser with the
    properties named on the controls. Numbers in the text are wrapped in spans that get
    <code>text-combine-upright: all</code> while tate-chu-yoko is on.
  {/snippet}
  <div class="unicode-vertical stack-md">
    <div class="row wrap gap-4">
      <SegmentedControl label="writing-mode" options={MODES} bind:value={mode} />
      <SegmentedControl label="text-orientation" options={ORIENTATIONS} bind:value={orientation} />
    </div>
    <div class="row wrap gap-4">
      <Toggle bind:checked={combined}>Tate-chu-yoko</Toggle>
      <Toggle bind:checked={readings}>Show furigana</Toggle>
    </div>
    <div
      class={[
        'stage surface-sunken bordered rounded-container',
        `mode-${mode}`,
        `orientation-${orientation}`,
        { 'readings-hidden': !readings },
      ]}
      lang="ja"
    >
      <p class="m-0">
        <ruby>吾輩<rp>（</rp><rt>わがはい</rt><rp>）</rp></ruby>は<ruby
          >猫<rp>（</rp><rt>ねこ</rt><rp>）</rp></ruby
        >である。第<span class={{ combined }}>12</span>話は<span class={{ combined }}>10</span
        >月<span class={{ combined }}>3</span>日に読む。Dokseo で OCR を使う。
      </p>
    </div>
  </div>
</DocsDemo>
