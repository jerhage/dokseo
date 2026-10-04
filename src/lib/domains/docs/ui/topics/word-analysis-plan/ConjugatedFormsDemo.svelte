<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import { segmentedText } from '../../../domain/unicode-text';
  import DocsDemo from '../../DocsDemo.svelte';
  import { UNICODE_WORDS_HREF } from './plan-sections';

  const FORMS = [
    { text: '食べました', headword: '食べる', meaning: 'ate (polite)' },
    { text: '食べなかった', headword: '食べる', meaning: 'did not eat' },
    { text: '上れば', headword: '上る', meaning: 'if (one) climbs' },
    { text: '行きます', headword: '行く', meaning: 'will go (polite)' },
  ] as const;

  const rows = FORMS.map((form) => ({
    ...form,
    segments: segmentedText(form.text, 'word').filter((one) => one.wordLike),
  }));
</script>

<DocsDemo label="Conjugated forms and the headword a dictionary lists">
  {#snippet caption()}
    The middle column is <code>new Intl.Segmenter('ja', {'{'} granularity: 'word' {'}'})</code>
    running in this browser, word-like segments only. The headword column is written by hand: it is what
    a dictionary entry is filed under, and no segment carries it. The
    <a href={UNICODE_WORDS_HREF}>segmenter demo on the Unicode page</a> takes any text.
  {/snippet}
  <Table size="sm" caption="Four conjugated verbs">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>In the text</TableHeaderCell>
        <TableHeaderCell>Segments</TableHeaderCell>
        <TableHeaderCell>Headword</TableHeaderCell>
        <TableHeaderCell>Meaning</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each rows as row (row.text)}
        <TableRow>
          <TableCell><span lang="ja">{row.text}</span></TableCell>
          <TableCell>
            <span class="row wrap gap-1" lang="ja">
              {#each row.segments as one (one.index)}
                <Badge variant="primary">{one.segment}</Badge>
              {/each}
            </span>
          </TableCell>
          <TableCell><span lang="ja">{row.headword}</span></TableCell>
          <TableCell>{row.meaning}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
</DocsDemo>
