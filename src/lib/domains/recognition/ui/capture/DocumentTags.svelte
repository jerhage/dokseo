<script lang="ts">
  import type { TagId } from '$lib/shared/ids';
  import type { Tag } from '../../domain/tag/tag';

  type Props = {
    readonly tags: readonly Tag[];
    readonly counts: ReadonlyMap<TagId, number>;
  };

  type Used = {
    readonly id: TagId;
    readonly name: string;
    readonly count: number;
  };

  let { tags, counts }: Props = $props();

  const used = $derived.by<readonly Used[]>(() => {
    const held = tags.flatMap((tag) => {
      const count = counts.get(tag.id) ?? 0;
      return count === 0 ? [] : [{ id: tag.id, name: tag.name, count }];
    });

    return held.toSorted(
      (earlier, later) => later.count - earlier.count || earlier.name.localeCompare(later.name),
    );
  });
</script>

{#if used.length > 0}
  <section class="block" aria-label="Tags in this document">
    <p class="caption">Tags in this document</p>
    <ul class="chips">
      {#each used as tag (tag.id)}
        <li class="chip">{tag.name} · {tag.count}</li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  .block {
    display: flex;
    flex: none;
    flex-direction: column;
    gap: var(--s-2);
    padding: var(--s-3) var(--s-4);
    border-top: 1px solid var(--c-border-1);
    font-family: var(--f-ui);
  }

  .caption {
    margin: 0;
    color: var(--c-text-10);
    font-family: var(--f-mono);
    font-size: 9.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-1);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .chip {
    padding: 4px 9px;
    border: 1px solid var(--c-border-4);
    border-radius: var(--r-8);
    background: var(--c-border-1);
    color: var(--c-text-5);
    font-size: 11px;
    line-height: 1;
  }
</style>
