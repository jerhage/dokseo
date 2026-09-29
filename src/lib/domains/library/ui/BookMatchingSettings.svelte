<script lang="ts">
  import Fieldset from '$lib/components/Fieldset.svelte';
  import Radio from '$lib/components/Radio.svelte';
  import { BOOK_MATCHING_OPTIONS } from './book-matching-setting';
  import { bookMatchingChosen, chooseBookMatching } from './book-matching.svelte';

  const uid = $props.id();
</script>

<div class="col gap-6 prose">
  <header class="col gap-1">
    <h1 class="text-lg">Library</h1>
    <p class="text-sm text-muted">
      How a file you add is recognised as a book you already have. A match opens that book, with its
      place and its captures, instead of adding a copy.
    </p>
  </header>

  <section class="surface bordered rounded-container p-5">
    <Fieldset legend="Match books by">
      <div class="col gap-3">
        {#each BOOK_MATCHING_OPTIONS as option (option.matching)}
          <Radio
            name="{uid}-matching"
            value={option.matching}
            group={bookMatchingChosen()}
            hint={option.hint}
            onchange={() => chooseBookMatching(option.matching)}
          >
            {option.label}
          </Radio>
        {/each}
      </div>
    </Fieldset>
  </section>
</div>
