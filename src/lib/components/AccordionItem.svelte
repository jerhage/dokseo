<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLDetailsAttributes } from 'svelte/elements';

  type Props = Omit<HTMLDetailsAttributes, 'title'> & {
    title: string | Snippet;
  };

  let { open = $bindable(false), title, class: className, children, ...rest }: Props = $props();
</script>

<details {...rest} bind:open class={['accordion-item', className]}>
  <summary class="accordion-trigger">
    {#if typeof title === 'string'}
      {title}
    {:else}
      {@render title()}
    {/if}
  </summary>
  <div class="accordion-body">
    {@render children?.()}
  </div>
</details>
