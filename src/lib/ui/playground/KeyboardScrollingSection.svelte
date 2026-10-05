<script lang="ts">
  import Card from '../components/Card.svelte';
  import { keyboardScrolling } from '../components/keyboard-scrolling';
  import Toggle from '../components/Toggle.svelte';
  import DemoSection from './DemoSection.svelte';

  const PARAGRAPHS = Array.from({ length: 40 }, (_, index) => index + 1);

  let forwarding = $state(false);
</script>

<DemoSection id="keyboard-scrolling" title="Keyboard scrolling" classes={[]}>
  <p class="text-sm text-muted">
    An attachment for a scroll area that is not the page. When nothing has focus, a scrolling key
    (Space, Page Up and Down, the arrows, Home, End) moves focus to the area quietly, so the key
    scrolls it. While it is on here, those keys scroll this box instead of the playground.
  </p>
  <Toggle bind:checked={forwarding}>Forward scrolling keys to the box</Toggle>
  <Card>
    <div class="relative aspect-video">
      {#if forwarding}
        <div
          class="pin-top h-full overflow-y-auto col gap-2 p-3 bordered rounded-control"
          tabindex="-1"
          {@attach keyboardScrolling}
        >
          {#each PARAGRAPHS as paragraph (paragraph)}
            <p class="m-0">
              Paragraph {paragraph}. Click outside any control, then press Page Down.
            </p>
          {/each}
        </div>
      {:else}
        <div class="pin-top h-full overflow-y-auto col gap-2 p-3 bordered rounded-control">
          {#each PARAGRAPHS as paragraph (paragraph)}
            <p class="m-0">
              Paragraph {paragraph}. Scrolling keys move the page while this is off.
            </p>
          {/each}
        </div>
      {/if}
    </div>
  </Card>
</DemoSection>
