<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
    label: string;
    children: Snippet;
  };

  let { label, class: className, children, ...rest }: Props = $props();

  const uid = $props.id();
</script>

<div {...rest} class={['settings-row', className]} role="group" aria-labelledby="{uid}-label">
  <span class="settings-row-label" id="{uid}-label">{label}</span>
  {@render children()}
</div>
