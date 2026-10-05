<script lang="ts">
  import Badge from '../components/Badge.svelte';
  import Button from '../components/Button.svelte';
  import Card from '../components/Card.svelte';
  import OverflowList from '../components/OverflowList.svelte';
  import type { TagColour } from '../components/classes';
  import DemoSection from './DemoSection.svelte';

  type Chip = { readonly name: string; readonly colour: TagColour };

  const CHIPS: readonly Chip[] = [
    { name: 'alpha', colour: 'rose' },
    { name: 'beta', colour: 'clay' },
    { name: 'gamma', colour: 'sage' },
    { name: 'delta', colour: 'sky' },
    { name: 'epsilon', colour: 'plum' },
  ];

  let count = $state(5);

  const chips = $derived(CHIPS.slice(0, count));
</script>

{#snippet chip(shown: Chip)}
  <Badge color={shown.colour} emphasis="quiet" dot>{shown.name}</Badge>
{/snippet}

<DemoSection id="overflow-list" title="Overflow list" classes={['overflow-list']}>
  <p class="text-sm text-muted">
    As many items as the room holds. When there are more, the last place is a count of the rest,
    which names them in its tooltip and to a screen reader.
  </p>
  <div class="row wrap items-center gap-2">
    <Button size="sm" disabled={count === 0} onclick={() => (count -= 1)}>Fewer</Button>
    <Button size="sm" disabled={count === CHIPS.length} onclick={() => (count += 1)}>More</Button>
    <code class="text-xs">{count} items, room 3</code>
  </div>
  <div class="grid-2">
    <Card>
      <div class="col gap-2">
        <code class="text-xs">a list</code>
        <OverflowList
          items={chips}
          room={3}
          item={chip}
          name={(shown) => shown.name}
          key={(shown) => shown.name}
          label="Tags"
          class="gap-2"
        />
      </div>
    </Card>
    <Card>
      <div class="col gap-2">
        <code class="text-xs">inline</code>
        <span class="row wrap items-center gap-2 text-xs text-muted">
          <span class="mono">p.012</span>
          <OverflowList
            inline
            items={chips}
            room={3}
            item={chip}
            name={(shown) => shown.name}
            key={(shown) => shown.name}
          />
        </span>
      </div>
    </Card>
  </div>
</DemoSection>
