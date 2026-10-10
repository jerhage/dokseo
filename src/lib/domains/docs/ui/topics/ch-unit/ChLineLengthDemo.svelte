<script lang="ts">
  import { onMount } from 'svelte';
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import {
    CH_FONTS,
    REM_LINE_LENGTH,
    SAMPLE_SENTENCE,
    charactersThatFit,
    formatCount,
    formatPixels,
    lengthIn,
  } from '../../../domain/ch-unit';
  import DocsDemo from '../../DocsDemo.svelte';
  import './ch-unit.css';
  import { loadChFonts } from './load-fonts';
  import MeasuredBox from './MeasuredBox.svelte';

  const REM_LENGTH = lengthIn('rem', REM_LINE_LENGTH);

  let columns = $state<Record<string, DOMRectReadOnly | undefined>>({});
  let rems = $state<Record<string, DOMRectReadOnly | undefined>>({});
  let sentences = $state<Record<string, DOMRectReadOnly | undefined>>({});

  onMount(() => {
    void loadChFonts();
  });
</script>

<DocsDemo label="Two ways to set the same column">
  {#snippet caption()}
    Each theme font twice: once with the ch value its theme sets, once with {REM_LENGTH}. The letter
    counts divide the column width by the measured average advance of one English sentence, so they
    are estimates for Latin text.
  {/snippet}
  <div class="ch-demo">
    <Table size="sm">
      <TableHeader>
        <TableRow>
          <TableHeaderCell>Font</TableHeaderCell>
          <TableHeaderCell>ch value</TableHeaderCell>
          <TableHeaderCell>Width</TableHeaderCell>
          <TableHeaderCell>Letters</TableHeaderCell>
          <TableHeaderCell>{REM_LENGTH} width</TableHeaderCell>
          <TableHeaderCell>Letters</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each CH_FONTS as font (font.slug)}
          {@const column = columns[font.slug]?.width ?? 0}
          {@const rem = rems[font.slug]?.width ?? 0}
          {@const sentence = sentences[font.slug]?.width ?? 0}
          <TableRow>
            <TableCell>
              <span class="font-text" style:--demo-font={font.stack}>{font.label}</span>
            </TableCell>
            <TableCell class="mono">{lengthIn('ch', font.proseCh)}</TableCell>
            <TableCell class="mono">{formatPixels(column)}</TableCell>
            <TableCell class="mono">
              {formatCount(charactersThatFit(column, sentence, SAMPLE_SENTENCE.length))}
            </TableCell>
            <TableCell class="mono">{formatPixels(rem)}</TableCell>
            <TableCell class="mono">
              {formatCount(charactersThatFit(rem, sentence, SAMPLE_SENTENCE.length))}
            </TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
    {#each CH_FONTS as font (font.slug)}
      <MeasuredBox
        stack={font.stack}
        inlineSize={lengthIn('ch', font.proseCh)}
        bind:rect={columns[font.slug]}
      />
      <MeasuredBox stack={font.stack} inlineSize={REM_LENGTH} bind:rect={rems[font.slug]} />
      <MeasuredBox stack={font.stack} text={SAMPLE_SENTENCE} bind:rect={sentences[font.slug]} />
    {/each}
  </div>
</DocsDemo>
