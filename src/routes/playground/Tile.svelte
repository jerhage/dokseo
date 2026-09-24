<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import type { CardVariant } from '$lib/components/classes';
  import type { ClassValue } from 'svelte/elements';

  type Props = {
    label: string;
    variant?: CardVariant;
    class?: ClassValue;
  };

  let { label, variant = 'default', class: className }: Props = $props();
</script>

<Card {variant} class={className}>
  <code class="text-xs">{label}</code>
</Card>
