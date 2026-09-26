<script lang="ts">
  import { useContainer } from '$lib/context';
  import { LibraryView } from '$lib/domains/library/ui/library-view.svelte';
  import { activeComparison, comparesBook, routeParameters, variantHref } from './comparison';

  const comparison = activeComparison();
  const needsBook = (comparison?.variants ?? []).some((variant) =>
    routeParameters(variant.route).includes('fileId'),
  );
  const shelf = new LibraryView(useContainer());
  const compared = $derived(
    comparison === null
      ? []
      : shelf.books.filter((book) => comparesBook(comparison, book.layoutKind)),
  );

  $effect(() => {
    if (needsBook) void shelf.load();
    return () => shelf.dispose();
  });
</script>

{#if comparison === null}
  <p class="p-4 text-muted">No design comparison is active.</p>
{:else if needsBook}
  <div class="col gap-3 p-4">
    <p class="text-muted">
      Comparing {comparison.title.toLowerCase()}: choose a book and a variant.
    </p>
    <ul class="list-reset col gap-2">
      {#each compared as book (book.id)}
        <li class="row wrap items-center gap-2">
          <span class="flex-fill truncate" lang={book.language}>{book.title}</span>
          {#each comparison.variants as variant (variant.route)}
            {@const href = variantHref(variant, { fileId: book.id })}
            {#if href !== null}
              <a {href}>{variant.label}</a>
            {/if}
          {/each}
        </li>
      {/each}
    </ul>
  </div>
{:else}
  <p class="p-4 text-muted">
    Comparing {comparison.title.toLowerCase()}: choose a variant above.
  </p>
{/if}
