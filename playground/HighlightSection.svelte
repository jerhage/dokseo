<script lang="ts">
  import Card from '../components/Card.svelte';
  import CommandItem from '../components/CommandItem.svelte';
  import Highlight from '../components/Highlight.svelte';
  import SearchField from '../components/SearchField.svelte';
  import DemoSection from './DemoSection.svelte';
  import { markedSegments } from './marked-segments';

  type Heading = { readonly label: string; readonly depth: number };

  const LINE = 'The harbour lights came on one by one across the harbour wall.';

  const HEADINGS: readonly Heading[] = [
    { label: 'Part one', depth: 0 },
    { label: 'Arrival', depth: 1 },
    { label: 'The harbour at night', depth: 2 },
    { label: 'Departure', depth: 1 },
    { label: 'Part two', depth: 0 },
  ];

  let query = $state('harbour');

  const segments = $derived(markedSegments(LINE, query));
</script>

<DemoSection id="highlight" title="Highlight and indent" classes={['indent']}>
  <p class="text-sm text-muted">
    Highlight marks the matched segments of a text with <code>mark</code> and leaves the rest as
    plain text. The indent utility pads the inline start by one step per level of
    <code>--indent-depth</code>.
  </p>
  <div class="grid-2">
    <Card>
      <div class="col gap-3">
        <SearchField bind:value={query} label="Mark" hideLabel placeholder="Type to mark" />
        <p class="m-0 text-lg"><Highlight {segments} /></p>
      </div>
    </Card>
    <Card>
      <ul class="list-reset col gap-0">
        {#each HEADINGS as heading (heading.label)}
          <li class="indent" style:--indent-depth={heading.depth}>
            <CommandItem>{heading.label}</CommandItem>
          </li>
        {/each}
      </ul>
    </Card>
  </div>
</DemoSection>
